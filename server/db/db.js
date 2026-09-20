import mongoose from "mongoose";

const connectToDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL, {
            serverSelectionTimeoutMS: 5000,
            family: 4
        });
        console.log("Connected to MongoDB");
        return true;
    } catch (error) {
        console.error("MongoDB connection failed. Start the MongoDB service and verify MONGODB_URL in server/.env:", error.message);
        return false;
    }
};

export default connectToDB;