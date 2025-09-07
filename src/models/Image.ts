import mongoose, { Schema, models } from "mongoose";

const ImageSchema = new Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
  },
  { timestamps: true }
);

// Prevent model overwrite during hot-reload in development
const Image = models.Image || mongoose.model("Image", ImageSchema);

export default Image;
