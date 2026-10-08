import User from "./models/User.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import connectToDB from "./db/db.js";
const userRegister = async () => {
    try {
        const connected = await connectToDB();
        if (!connected) {
            process.exitCode = 1;
            return;
        }

        const adminEmail = (process.env.ADMIN_EMAIL || "admin@bdu.edu.et").trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            existingAdmin.name = "Admin";
            existingAdmin.email = adminEmail;
            existingAdmin.password = await bcrypt.hash(adminPassword, 10);
            existingAdmin.role = "admin";
            existingAdmin.status = "Active";
            await existingAdmin.save();
            console.log(`Admin account ensured: ${adminEmail}`);
        } else {
            await User.create({
                name: "Admin",
                email: adminEmail,
                password: await bcrypt.hash(adminPassword, 10),
                role: "admin",
                status: "Active"
            });
            console.log(`Admin account created: ${adminEmail}`);
        }

        const hrEmail = (process.env.HR_EMAIL || "abebu@bdu.edu.et").trim().toLowerCase();
        const hrPassword = process.env.HR_PASSWORD || "12345678";
        const existingHRUser = await User.findOne({ email: hrEmail });

        if (existingHRUser) {
            existingHRUser.name = "HR Officer";
            existingHRUser.email = hrEmail;
            existingHRUser.password = await bcrypt.hash(hrPassword, 10);
            existingHRUser.role = "HR Officer";
            existingHRUser.status = "Active";
            await existingHRUser.save();
            console.log(`HR Officer account ensured: ${hrEmail}`);
        } else {
            await User.create({
                name: "HR Officer",
                email: hrEmail,
                password: await bcrypt.hash(hrPassword, 10),
                role: "HR Officer",
                status: "Active"
            });
            console.log(`HR Officer account created: ${hrEmail}`);
        }

        console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
        console.log(`HR Officer login: ${hrEmail} / ${hrPassword}`);
    } catch (error) {
        console.error("Error creating admin user:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

userRegister();