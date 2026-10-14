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

        // 1. Admin Account Configuration
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

        // 2. HR Officer Account Configuration (Username: abebu | Password: 12345678)
        const hrUsername = (process.env.HR_USERNAME || "abebu").trim();
        const hrEmail = (process.env.HR_EMAIL || "abebu@bdu.edu.et").trim().toLowerCase();
        const hrPassword = process.env.HR_PASSWORD || "12345678";

        // ቀደም ሲል በኢሜይል ወይም በዩዘርኔም የተመዘገበ ከሆነ መፈለጊያ
        const existingHRUser = await User.findOne({
            $or: [{ email: hrEmail }, { username: hrUsername }]
        });

        const hashedPassword = await bcrypt.hash(hrPassword, 10);

        if (existingHRUser) {
            existingHRUser.name = "HR Officer";
            existingHRUser.username = hrUsername;
            existingHRUser.email = hrEmail;
            existingHRUser.password = hashedPassword;
            existingHRUser.role = "HR Officer"; // ወይም በስርዓትህ Role መሰረት "hr_officer"
            existingHRUser.status = "Active";
            await existingHRUser.save();
            console.log(`HR Officer account updated/ensured: Username: ${hrUsername} | Email: ${hrEmail}`);
        } else {
            await User.create({
                name: "HR Officer",
                username: hrUsername,
                email: hrEmail,
                password: hashedPassword,
                role: "HR Officer",
                status: "Active"
            });
            console.log(`HR Officer account created: Username: ${hrUsername} | Email: ${hrEmail}`);
        }

        console.log("\n==========================================");
        console.log(`🔑 Admin Login: ${adminEmail} / ${adminPassword}`);
        console.log(`🔑 HR Officer Login: ${hrUsername} (or ${hrEmail}) / ${hrPassword}`);
        console.log("==========================================\n");

    } catch (error) {
        console.error("Error seeding users:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log("Database disconnected successfully.");
    }
};

userRegister();