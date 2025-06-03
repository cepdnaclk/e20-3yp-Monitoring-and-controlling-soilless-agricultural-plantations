import "dotenv/config";

export default {
  expo: {
    name: "PlantPulse",
    slug: "PlantPulse",
    version: "1.0.1",
    android: {
      package: "com.sachiya.plantpulse",
      versionCode: 2 // 🔧 Use a unique identifier!
    },
    extra: {
      eas: {
        projectId: "2493711b-fc21-4860-9a1d-a2cc90d42dab",
      },
      cloudinarySecret: process.env.CLOUDINARY_SECRET,
      cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
    },
  },
};
