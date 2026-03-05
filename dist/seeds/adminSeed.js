"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const admins = [
    {
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@vendorspot.com',
        password: 'SuperAdmin@2026!',
        role: 'super_admin',
        emailVerified: true,
        status: 'active',
    },
    {
        firstName: 'Regular',
        lastName: 'Admin',
        email: 'admin@vendorspot.com',
        password: 'Admin@2026!',
        role: 'admin',
        emailVerified: true,
        status: 'active',
    },
    {
        firstName: 'Finance',
        lastName: 'Admin',
        email: 'finance@vendorspot.com',
        password: 'Finance@2026!',
        role: 'financial_admin',
        emailVerified: true,
        status: 'active',
    },
];
async function seedAdmins() {
    try {
        await (0, database_1.connectDB)();
        logger_1.logger.info('Connected to database');
        for (const admin of admins) {
            const existing = await User_1.default.findOne({ email: admin.email });
            if (existing) {
                // Update existing user to admin role
                existing.role = admin.role;
                existing.status = 'active';
                existing.emailVerified = true;
                await existing.save();
                logger_1.logger.info(`Updated existing user: ${admin.email} → ${admin.role}`);
            }
            else {
                // Create new admin user (password gets hashed by pre-save hook)
                await User_1.default.create(admin);
                logger_1.logger.info(`Created: ${admin.email} (${admin.role})`);
            }
        }
        console.log('\n========================================');
        console.log('  Admin accounts seeded successfully!');
        console.log('========================================\n');
        console.log('  Super Admin:');
        console.log('    Email:    superadmin@vendorspot.com');
        console.log('    Password: SuperAdmin@2026!\n');
        console.log('  Admin:');
        console.log('    Email:    admin@vendorspot.com');
        console.log('    Password: Admin@2026!\n');
        console.log('  Financial Admin:');
        console.log('    Email:    finance@vendorspot.com');
        console.log('    Password: Finance@2026!\n');
        console.log('========================================\n');
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Seed failed:', error);
        await mongoose_1.default.disconnect();
        process.exit(1);
    }
}
seedAdmins();
//# sourceMappingURL=adminSeed.js.map