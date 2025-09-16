import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Purchase from "@/models/Purchase";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 }
      );
    }

    // Verify payment with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // console.log("Session:", session);

    if (!session) {
      return NextResponse.json(
        { error: "Failed to fetch payment details from Stripe" },
        { status: 400 }
      );
    }

    // Verify amount
    const expectedAmount = 10000; // 100.00 in cents
    if (session.amount_total !== expectedAmount || session.currency !== "inr" || session.payment_status !== "paid" || session.customer_email !== user.primaryEmailAddress?.emailAddress) {
      return NextResponse.json(
        { error: "Invalid payment amount or currency or email mismatch" },
        { status: 400 }
      );
    }

    // Connect to DB and verify user + save purchase
    await connectDB();
    // console.log("Updating purchase");

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
        // stripeSessionId: sessionId,
      },
      {
        userId: userId,
        userEmail: user.primaryEmailAddress?.emailAddress || "",
        userName: user.fullName || "",
        stripeSessionId: sessionId,
        amount: session.amount_total || 0,
        currency: session.currency || "inr",
        paymentMethod: "stripe",
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
      purchaseId: purchase?._id,
      message: "Purchase verified and recorded successfully",
    });
  } catch (error) {
    console.error("Error confirming Stripe payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
