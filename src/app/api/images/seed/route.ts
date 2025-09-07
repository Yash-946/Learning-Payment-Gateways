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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error inserting images:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      console.error("Unknown error occurred:", error);
      return NextResponse.json({ error: "An unknown error occurred" }, { status: 500 });
    }
  }
}
