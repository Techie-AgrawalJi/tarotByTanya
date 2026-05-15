import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import multer from "multer";
import { z } from "zod";
import { v2 as cloudinary } from "cloudinary";
import { getReviewsCollection, type ReviewDocument } from "../lib/mongo";
import { logger } from "../lib/logger";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 4,
  },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed."));
      return;
    }

    cb(null, true);
  },
});

const reviewInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  reviewText: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

type ReviewApiImage = {
  id: string;
  filename: string;
  mimeType: string;
  src: string;
};

type ReviewApiRecord = {
  id: string;
  name: string;
  rating: number;
  reviewText: string | null;
  images: ReviewApiImage[];
  createdAt: string;
};

function toReviewApiRecord(doc: ReviewDocument & { _id?: unknown }): ReviewApiRecord {
  const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
  const id =
    typeof doc._id === "string"
      ? doc._id
      : doc._id && typeof doc._id === "object" && "toHexString" in doc._id
        ? String((doc._id as { toHexString: () => string }).toHexString())
        : randomUUID();

  return {
    id,
    name: doc.name,
    rating: doc.rating,
    reviewText: doc.reviewText,
    images: doc.images.map((image, index) => ({
      id: `${index}-${image.filename}`,
      filename: image.filename,
      mimeType: image.mimeType,
      src: image.cloudinaryUrl || (image.base64 ? `data:${image.mimeType};base64,${image.base64}` : ""),
    })),
    createdAt: createdAt.toISOString(),
  };
}

router.get("/reviews", async (_req, res) => {
  try {
    const collection = await getReviewsCollection();
    const [reviews, stats] = await Promise.all([
      collection
        .find({})
        .sort({ createdAt: -1 })
        .limit(24)
        .toArray(),
      collection
        .aggregate([
          {
            $group: {
              _id: null,
              totalReviews: { $sum: 1 },
              averageRating: { $avg: "$rating" },
            },
          },
        ])
        .toArray(),
    ]);

    const totalReviews = stats[0]?.totalReviews ?? 0;
    const averageRating = stats[0]?.averageRating ?? 0;

    res.json({
      reviews: reviews.map(toReviewApiRecord),
      summary: {
        totalReviews,
        averageRating: Number(Number(averageRating).toFixed(1)),
      },
    });
  } catch (err) {
    logger.error({ err }, "Failed to load reviews");
    res.status(500).json({ message: "Failed to load reviews." });
  }
});

router.post("/reviews", upload.array("photos", 4), async (req, res) => {
  try {
    const parsed = reviewInputSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ message: "Please provide a valid name, rating, and optional review text." });
      return;
    }

    const files = Array.isArray(req.files) ? req.files : [];

    if (!parsed.data.reviewText && files.length === 0) {
      res.status(400).json({ message: "Add text, photos, or both before submitting your review." });
      return;
    }

    // Upload images to Cloudinary
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        try {
          const result = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: "auto",
                folder: "tarot-reviews",
                public_id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(file.buffer);
          });
          return result;
        } catch (err) {
          logger.error({ err, filename: file.originalname }, "Failed to upload image to Cloudinary");
          throw new Error(`Failed to upload image: ${file.originalname}`);
        }
      })
    );

    const images = uploadedImages.map((cloudinaryResult, index) => ({
      filename: files[index].originalname,
      mimeType: files[index].mimetype,
      cloudinaryUrl: cloudinaryResult.secure_url,
    }));

    const review: ReviewDocument = {
      name: parsed.data.name,
      rating: parsed.data.rating,
      reviewText: parsed.data.reviewText,
      images,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const collection = await getReviewsCollection();
    const result = await collection.insertOne(review);

    res.status(201).json({
      review: toReviewApiRecord({ ...review, _id: result.insertedId }),
    });
  } catch (err) {
    logger.error({ err }, "Failed to save review");
    res.status(500).json({ message: "Failed to save review." });
  }
});

export default router;