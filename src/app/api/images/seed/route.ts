import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Image from "@/models/Image";

export async function POST() {
  try {
    await connectDB();

    const premiumImages = [
      {
        title: "image title",
        url: "image url",
      },
      {
        title: "image title",
        url: "image url",
      },
    ];

    // Insert only if they don't already exist
    const inserted = await Image.insertMany(premiumImages, { ordered: false });

    return NextResponse.json({
      message: "Images seeded successfully",
      count: inserted.length,
    });
  } catch (error: any) {
    console.error("Error inserting images:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
