import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const verifyUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: "Authentication token not provided." });
        }

        const decoded = jwt.verify(token, process.env.JWT_KEY);
        if (!decoded) {
            return res.status(401).json({ success: false, message: "Authentication token is not valid." });
        }

        const user = await User.findById(decoded._id).select('-password');
        if (!user) {
            return res.status(401).json({ success: false, message: "Authenticated user was not found." });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Authentication token is expired or invalid." });
    }
};

export default verifyUser;