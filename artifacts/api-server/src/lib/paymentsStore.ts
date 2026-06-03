import { getPaymentModel } from "./mongoose";

type PaymentRecord = Record<string, any>;

export async function readPayments(): Promise<PaymentRecord[]> {
  const Payment = await getPaymentModel();
  return (await Payment.find({}).sort({ createdAt: 1, _id: 1 }).lean<PaymentRecord>().exec()) as PaymentRecord[];
}

export async function writePayments(payments: PaymentRecord[]): Promise<void> {
  const Payment = await getPaymentModel();
  if (payments.length === 0) {
    await Payment.deleteMany({});
    return;
  }

  const normalizedPayments = payments.map((payment) => ({
    ...payment,
    id: String(payment.id || payment.orderId || `payment_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`),
  }));

  const ids = normalizedPayments.map((payment) => payment.id).filter(Boolean);

  await Payment.bulkWrite(
    normalizedPayments.map((payment) => ({
      updateOne: {
        filter: { id: payment.id },
        update: { $set: payment },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  await Payment.deleteMany({ id: { $nin: ids } });
}

export async function insertPayment(payment: PaymentRecord): Promise<PaymentRecord> {
  const Payment = await getPaymentModel();
  const normalized = {
    ...payment,
    id: String(payment.id || payment.orderId || `payment_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`),
  };

  await Payment.updateOne({ id: normalized.id }, { $set: normalized }, { upsert: true }).exec();
  return normalized;
}

export async function updatePaymentById(id: string, update: Partial<PaymentRecord>): Promise<PaymentRecord | null> {
  const Payment = await getPaymentModel();
  await Payment.updateOne({ id }, { $set: update }).exec();
  return await Payment.findOne({ id }).lean<PaymentRecord>().exec();
}

export async function findPaymentById(id: string): Promise<PaymentRecord | null> {
  const Payment = await getPaymentModel();
  return (
    (await Payment.findOne({
      $or: [
        { id },
        { orderId: id },
        { razorpayPaymentId: id },
        { "gatewayResponse.id": id },
        { "gatewayResponse.order_id": id },
      ],
    }).lean<PaymentRecord>().exec()) || null
  );
}
