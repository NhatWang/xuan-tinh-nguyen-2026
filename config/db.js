const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ Missing MONGO_URI in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 → fix Railway IPv6 issues
    });

    console.log("✅ MongoDB Atlas connected!");
  } catch (err) {
    console.error("❌ DB Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
