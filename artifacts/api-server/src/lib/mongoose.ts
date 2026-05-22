import mongoose, { Schema, type Model } from "mongoose";
import "./env";

const MONGODB_URI = process.env.MONGODB_URI?.trim();
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME?.trim() || undefined;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI must be set before using Mongo-backed booking storage.");
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

paymentSchema.index({ id: 1 }, { unique: true, sparse: true });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ reference: 1 });

let connectPromise: Promise<typeof mongoose> | null = null;

function getDatabaseOptions() {
  return MONGODB_DB_NAME ? { dbName: MONGODB_DB_NAME } : undefined;
}

export async function connectMongo() {
  if (!connectPromise) {
    connectPromise = mongoose.connect(MONGODB_URI, getDatabaseOptions()).then(() => mongoose);
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
