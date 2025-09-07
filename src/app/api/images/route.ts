import { NextResponse } from "next/server";

import Image from "@/models/Image";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectDB();
    const images = await Image.find().sort({ createdAt: -1 });
    return NextResponse.json(images);
  } catch (error: any) {
    console.error("Error fetching images:", error.message);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}
