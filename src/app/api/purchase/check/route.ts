import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Purchase from "@/models/Purchase";

export async function GET() {
  try {
    // Get the authenticated user
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectDB();
    
    // Check if user has purchased access (either Razorpay or Stripe)
    // Also verify the email matches for additional security
    const purchase = await Purchase.findOne({
      userId: userId,
      userEmail: user.primaryEmailAddress?.emailAddress || "",
      status: "completed",
      $or: [
        { razorpayPaymentId: { $exists: true, $ne: null } },
        { stripePaymentIntentId: { $exists: true, $ne: null } },
        { stripeSessionId: { $exists: true, $ne: null } }
      ]
    });

    return NextResponse.json({
      hasPurchased: !!purchase,
      purchaseDate: purchase?.createdAt || null
    });

  } catch (error) {
    console.error("Error checking purchase status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
