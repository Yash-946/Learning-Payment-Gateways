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

    console.log("User:", user, "UserId:", userId);

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
    // console.log("Received purchase data:", body);

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

    // console.log("Payment signature verified successfully");

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

    // console.log("Fetched payment data from Razorpay:", paymentData);

    // 3. Ensure payment is completed and amount is correct
    const expectedAmount = 10000; // ₹100 in paise
    if (
      paymentData.status !== "captured" ||
      paymentData.amount !== expectedAmount ||
      paymentData.currency !== "INR" || paymentData.email !== user.primaryEmailAddress?.emailAddress
    ) {
      return NextResponse.json(
        { error: "Invalid payment data or amount mismatch" },
        { status: 400 }
      );
    }

    // console.log("Payment data validated successfully");

    // 4. Connect to DB and verify user + save purchase
    await connectDB();

    // First check if there's an existing purchase with this userId
    const existingPurchase = await Purchase.findOne({
      userId: userId,
      status: "completed"
    });

    // If there's an existing purchase, verify the email matches
    if (existingPurchase && existingPurchase.userEmail !== user.primaryEmailAddress?.emailAddress) {
      return NextResponse.json(
        { error: "Email verification failed - user mismatch" },
        { status: 403 }
      );
    }

    const purchase = await Purchase.findOneAndUpdate(
      {
        userId: userId
        // razorpayOrderId: razorpayOrderId,
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
        paymentMethod: "razorpay",
        status: "completed",
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    // console.log("Purchase recorded successfully:", purchase);

    return NextResponse.json({
      success: true,
      purchaseId: purchase?._id,
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
