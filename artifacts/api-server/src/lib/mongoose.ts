import mongoose, { Schema, type Model } from "mongoose";
import "./env";

const MONGODB_URI = process.env.MONGODB_URI?.trim();
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME?.trim() || undefined;

if (!MONGODB_URI) {
  // Do not throw when running in local/dev without a MongoDB URL.
  // Higher-level code may provide file-based fallbacks (see bookingsStore).
  // Log a gentle warning so developers know DB is not configured.
  // eslint-disable-next-line no-console
  console.warn("MONGODB_URI is not set — running without MongoDB. Falling back to file storage where supported.");
}

type LooseDocument = Record<string, any>;

const bookingSchema = new Schema<LooseDocument>(
  {},
  {
    strict: false,
    versionKey: false,
    minimize: false,
  },
);

bookingSchema.index({ id: 1 });
bookingSchema.index({ paymentReference: 1 }, { unique: false });
bookingSchema.index({ slotDate: 1, startTime: 1 });

const paymentSchema = new Schema<LooseDocument>(
  {},
  {
    strict: false,
    versionKey: false,
    minimize: false,
  },
);

const bookingCounterSchema = new Schema<LooseDocument>(
  {
    _id: { type: String },
  },
  {
    strict: false,
    versionKey: false,
    minimize: false,
  },
);

const bookingConfirmationMarkerSchema = new Schema<LooseDocument>(
  {
    _id: { type: String },
  },
  {
    strict: false,
    versionKey: false,
    minimize: false,
  },
);

const seenClientPhoneSchema = new Schema<LooseDocument>(
  {
    _id: { type: String },
  },
  {
    strict: false,
    versionKey: false,
    minimize: false,
  },
);

const guideAvailabilitySchema = new Schema<LooseDocument>(
  {},
  {
    strict: false,
    versionKey: false,
    minimize: false,
  },
);

paymentSchema.index({ id: 1 }, { unique: true, sparse: true });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ reference: 1 });
bookingCounterSchema.index({ id: 1 }, { unique: true, sparse: true });
bookingConfirmationMarkerSchema.index({ id: 1 }, { unique: true, sparse: true });
seenClientPhoneSchema.index({ phoneKey: 1 }, { unique: true, sparse: true });
guideAvailabilitySchema.index({ id: 1 }, { unique: true, sparse: true });

let connectPromise: Promise<typeof mongoose> | null = null;

function getDatabaseOptions() {
  return MONGODB_DB_NAME ? { dbName: MONGODB_DB_NAME } : undefined;
}

export async function connectMongo() {
  if (!connectPromise) {
    if (!MONGODB_URI) {
      // No DB configured — make connectMongo a resolved promise so callers can continue.
      connectPromise = Promise.resolve(mongoose);
    } else {
      connectPromise = mongoose.connect(MONGODB_URI!, getDatabaseOptions()).then(() => mongoose);
    }
  }

  return connectPromise;
}

function getModel<T extends LooseDocument>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) || mongoose.model<T>(name, schema);
}

export async function getBookingModel() {
  await connectMongo();
  return getModel("Booking", bookingSchema);
}

export async function getPaymentModel() {
  await connectMongo();
  return getModel("Payment", paymentSchema);
}

export async function getBookingCounterModel() {
  await connectMongo();
  return getModel("BookingCounter", bookingCounterSchema);
}

export async function getBookingConfirmationMarkerModel() {
  await connectMongo();
  return getModel("BookingConfirmationMarker", bookingConfirmationMarkerSchema);
}

export async function getSeenClientPhoneModel() {
  await connectMongo();
  return getModel("SeenClientPhone", seenClientPhoneSchema);
}

export async function getGuideAvailabilityModel() {
  await connectMongo();
  return getModel("GuideAvailability", guideAvailabilitySchema);
}
