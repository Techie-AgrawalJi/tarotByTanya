import { MongoClient, type Collection } from "mongodb";

export type ReviewImageDocument = {
  filename: string;
  mimeType: string;
  cloudinaryUrl?: string;
  base64?: string; // Keep for backward compatibility with old records
};

export type ReviewDocument = {
  name: string;
  rating: number;
  reviewText: string | null;
  images: ReviewImageDocument[];
  createdAt: Date;
  updatedAt: Date;
};

let clientPromise: Promise<MongoClient> | null = null;
let reviewCollectionPromise: Promise<Collection<ReviewDocument>> | null = null;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI must be set. Did you forget to provision MongoDB?",
    );
  }

  return uri;
}

function getDatabaseName(): string {
  return process.env.MONGODB_DB_NAME ?? "tarotByTanya";
}

async function getClient(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = new MongoClient(getMongoUri()).connect();
  }

  return clientPromise;
}

export async function getReviewsCollection(): Promise<Collection<ReviewDocument>> {
  if (!reviewCollectionPromise) {
    reviewCollectionPromise = (async () => {
      const client = await getClient();
      const collection = client.db(getDatabaseName()).collection<ReviewDocument>("reviews");

      await collection.createIndex({ createdAt: -1 });

      return collection;
    })();
  }

  return reviewCollectionPromise;
}