import User from "./models/User.js";
import bcrypt from "bcrypt";
import connectToDB from "./db/db.js";
const userRegister = async () => {
    try {
        await connectToDB();
        const hashpassword = await bcrypt.hash("admin123", 10);
        const newUser = new User({
            name: "Admin",
            email: "admin@bdu.edu.et",
            password: hashpassword,
            role: "admin"
        });
        await newUser.save();
        console.log("Admin user created");
    } catch (error) {
        console.error("Error creating admin user:", error);
        process.exitCode = 1;
    }
};

userRegister();