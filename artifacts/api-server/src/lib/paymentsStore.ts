import { getPaymentModel } from "./mongoose";

type PaymentRecord = Record<string, any>;

export async function readPayments(): Promise<PaymentRecord[]> {
  const Payment = await getPaymentModel();
  return (await Payment.find({}).sort({ createdAt: 1, _id: 1 }).lean<PaymentRecord>().exec()) as PaymentRecord[];
}

export async function writePayments(payments: PaymentRecord[]): Promise<void> {
  const Payment = await getPaymentModel();

  await Payment.deleteMany({});

  if (payments.length > 0) {
    await Payment.insertMany(payments, { ordered: true });
  }
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
