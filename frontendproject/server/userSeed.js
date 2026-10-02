import User from "./models/User.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import connectToDB from "./db/db.js";
const userRegister = async () => {
    try {
        await connectToDB();
        const existingAdmin = await User.findOne({ email: "admin@bdu.edu.et" });
        if (!existingAdmin) {
            await User.create({
                name: "Admin",
                email: "admin@bdu.edu.et",
                password: await bcrypt.hash("admin123", 10),
                role: "admin",
                status: "Active"
            });
            console.log("Admin user created");
        }

        const hrEmail = (process.env.HR_EMAIL || "hr.officer@bdu.edu.et").trim().toLowerCase();
        const existingHRUser = await User.findOne({ email: hrEmail });
        if (existingHRUser) {
            if (existingHRUser.role.trim().toLowerCase() !== "hr officer") {
                throw new Error(`Cannot seed HR Officer: ${hrEmail} is already used by another role.`);
            }
            console.log(`HR Officer account already exists: ${hrEmail}`);
            return;
        }

        const hrPassword = process.env.HR_PASSWORD || randomBytes(18).toString("hex");
        await User.create({
            name: "HR Officer",
            email: hrEmail,
            password: await bcrypt.hash(hrPassword, 10),
            role: "HR Officer",
            status: "Active"
        });
        console.log(`HR Officer email: ${hrEmail}`);
        if (process.env.HR_PASSWORD) {
            console.log("HR Officer account created using HR_PASSWORD from the environment.");
        } else {
            console.log(`Temporary HR Officer password: ${hrPassword}`);
        }
    } catch (error) {
        console.error("Error creating admin user:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

userRegister();