import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Purchase from "@/models/Purchase";

export async function GET() {
  try {
    // Get the authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectDB();
    
    // Check if user has purchased access
    const purchase = await Purchase.findOne({
      userId: userId,
      status: "completed"
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
