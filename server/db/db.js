import mongoose from "mongoose";

const connectToDB = async () => {
    const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL;
    if (!mongoUrl) {
        console.error("MongoDB connection failed. Set MONGODB_URI or MONGODB_URL in server/.env.");
        return false;
    }

    try {
        await mongoose.connect(mongoUrl, {
            serverSelectionTimeoutMS: 45000, // ሰዓቱን ወደ 45 ሰከንድ ከፍ በማድረግ ቲማውት እንዳይኖር ማድረግ
            socketTimeoutMS: 45000,         // የኔትወርክ መቆራረጥ እንዳይፈጠር
            connectTimeoutMS: 45000,
            heartbeatFrequencyMS: 10000,    // ከሞንጎዲቢ ጋር ያለውን ግንኙነት በንቃት መከታተያ
            family: 4                       // IPv4 ብቻ እንዲጠቀም ማድረግ
        });
        console.log("Connected to MongoDB successfully!");
        return true;
    } catch (error) {
        console.error("MongoDB connection failed:", error.stack || error);
        return false;
    }
};

export default connectToDB;