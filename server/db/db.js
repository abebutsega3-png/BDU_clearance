import mongoose from "mongoose";

const connectToDB = async () => {
    const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL;
    if (!mongoUrl) {
        console.error("MongoDB connection failed. Set MONGODB_URI or MONGODB_URL in server/.env.");
        return false;
    }

    try {
        await mongoose.connect(mongoUrl, {
            serverSelectionTimeoutMS: 5000,
            family: 4
        });
        console.log("Connected to MongoDB");
        return true;
    } catch (error) {
        console.error("MongoDB connection failed. Start the MongoDB service and verify MONGODB_URI or MONGODB_URL in server/.env:", error.message);
        return false;
    }
};

export default connectToDB;