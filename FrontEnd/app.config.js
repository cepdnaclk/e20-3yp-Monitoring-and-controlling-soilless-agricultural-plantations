import "dotenv/config";

export default {
  expo: {
    name: "PlantPulse",
    slug: "PlantPulse",
    version: "1.0.0",
    extra: {
      cloudinarySecret: process.env.CLOUDINARY_SECRET,
      cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
    },
  },
};
