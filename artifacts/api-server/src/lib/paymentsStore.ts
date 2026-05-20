import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

export async function readPayments() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(PAYMENTS_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    return [];
  }
}

export async function writePayments(payments: any[]) {
  await ensureDataDir();
  await fs.writeFile(PAYMENTS_FILE, JSON.stringify(payments, null, 2), "utf-8");
}

export async function findPaymentById(id: string) {
  const payments = await readPayments();
  return payments.find((p: any) => p.id === id) || null;
}
