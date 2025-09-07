import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Purchase from "@/models/Purchase";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
    console.log("Received purchase data:", body);

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing required payment details" },
        { status: 400 }
      );
    }

    // 1. Verify the payment signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    // 2. Verify payment details directly with Razorpay API
    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpayPaymentId}`,
      {
        method: "GET",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
            ).toString("base64"),
        },
      }
    );

    const paymentData = await razorpayResponse.json();

    if (!razorpayResponse.ok || !paymentData) {
      return NextResponse.json(
        { error: "Failed to fetch payment details from Razorpay" },
        { status: 500 }
      );
    }

    // 3. Ensure payment is completed and amount is correct
    const expectedAmount = 500; // ₹5 in paise
    if (
      paymentData.status !== "captured" ||
      paymentData.amount !== expectedAmount ||
      paymentData.currency !== "INR"
    ) {
      return NextResponse.json(
        { error: "Invalid payment data or amount mismatch" },
        { status: 400 }
      );
    }

    // 4. Connect to DB and save purchase
    await connectDB();

    const purchase = await Purchase.findOneAndUpdate(
      {
        userId: userId,
        razorpayOrderId: razorpayOrderId,
      },
      {
        userId: userId,
        userEmail: user.primaryEmailAddress?.emailAddress || "",
        userName: user.fullName || "",
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: "completed",
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      purchaseId: purchase._id,
      message: "Purchase verified and recorded successfully",
    });
  } catch (error) {
    console.error("Error recording purchase:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
