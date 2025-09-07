import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST() {
  try {
    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    // Define the order details
    const options = {
      amount: 1000, // amount in paise -> ₹50
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1, // auto capture payment
    };

    // Create the order
    const order = await razorpay.orders.create(options);

    return NextResponse.json(order);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error creating Razorpay order:", error.message);
    } else {
      console.error("Unknown error occurred:", error);
    }
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
