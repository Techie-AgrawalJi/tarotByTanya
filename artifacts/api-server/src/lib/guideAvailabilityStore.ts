import { getGuideAvailabilityModel } from "./mongoose";

export type GuideAvailabilityRecord = {
  id: string;
  available: boolean;
  message: string;
  updatedAt: Date;
  createdAt: Date;
};

const GUIDE_AVAILABILITY_ID = "guide-availability";

function normalizeGuideAvailability(record: any): GuideAvailabilityRecord {
  const available = record?.available !== false;
  return {
    id: String(record?.id || GUIDE_AVAILABILITY_ID),
    available,
    message: String(record?.message || (available ? "Guide is available today." : "Guide is not available today.")).trim(),
    updatedAt: record?.updatedAt ? new Date(record.updatedAt) : new Date(),
    createdAt: record?.createdAt ? new Date(record.createdAt) : new Date(),
  };
}

export async function readGuideAvailability(): Promise<GuideAvailabilityRecord> {
  const GuideAvailability = await getGuideAvailabilityModel();
  let record = await GuideAvailability.findOne({ id: GUIDE_AVAILABILITY_ID }).lean().exec();

  if (!record) {
    const now = new Date();
    record = await GuideAvailability.create({
      id: GUIDE_AVAILABILITY_ID,
      available: true,
      message: "Guide is available today.",
      createdAt: now,
      updatedAt: now,
    });
  }

  return normalizeGuideAvailability(record);
}

export async function setGuideAvailability(input: { available: boolean; message?: string }): Promise<GuideAvailabilityRecord> {
  const GuideAvailability = await getGuideAvailabilityModel();
  const now = new Date();
  const nextMessage = String(
    input.message || (input.available ? "Guide is available today." : "Guide is not available today."),
  ).trim();

  const updated = await GuideAvailability.findOneAndUpdate(
    { id: GUIDE_AVAILABILITY_ID },
    {
      $set: {
        id: GUIDE_AVAILABILITY_ID,
        available: Boolean(input.available),
        message: nextMessage,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { returnDocument: "after", upsert: true },
  ).lean().exec();

  return normalizeGuideAvailability(updated);
}

export async function isGuideAvailable(): Promise<boolean> {
  const record = await readGuideAvailability();
  return record.available;
}