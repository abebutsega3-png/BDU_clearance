import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

const verifyUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: "Authentication token not provided." });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_KEY);
    } catch {
        return res.status(401).json({ success: false, message: "Authentication token is expired or invalid." });
    }

    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: "Database unavailable. Please check the MongoDB connection and try again.",
        });
    }

    try {
        const user = await User.findById(decoded._id).select('-password').maxTimeMS(5000);
        if (!user) {
            return res.status(401).json({ success: false, message: "Authentication token is not valid." });
        }
        if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
            return res.status(401).json({ success: false, message: "Your session has been revoked. Please sign in again." });
        }

        req.user = user;
        return next();
    } catch (error) {
        console.error('Authentication user lookup failed:', error.message);
        return res.status(503).json({
            success: false,
            message: "Unable to reach the database to verify your account. Please try again.",
        });
    }
};

export default verifyUser;