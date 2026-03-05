"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// seeds/challengeSeeds.ts
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Additional_1 = require("../models/Additional");
dotenv_1.default.config();
const now = new Date();
const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const challenges = [
    // ==================== BUYER CHALLENGES ====================
    {
        title: 'First Purchase',
        description: 'Make your first purchase on VendorSpot and earn a reward!',
        type: 'buyer',
        targetType: 'orders',
        targetValue: 1,
        rewardType: 'points',
        rewardValue: 100,
        startDate: now,
        endDate: in30Days,
        isRecurring: false,
        isActive: true,
    },
    {
        title: 'Shopping Spree',
        description: 'Complete 5 orders this week to unlock a cash reward.',
        type: 'buyer',
        targetType: 'orders',
        targetValue: 5,
        rewardType: 'cash',
        rewardValue: 500,
        startDate: now,
        endDate: in7Days,
        isRecurring: true,
        recurringPeriod: 'weekly',
        isActive: true,
    },
    {
        title: 'Big Spender',
        description: 'Spend a total of ₦50,000 on VendorSpot this month.',
        type: 'buyer',
        targetType: 'orders',
        targetValue: 10,
        rewardType: 'cash',
        rewardValue: 2000,
        startDate: now,
        endDate: in30Days,
        isRecurring: true,
        recurringPeriod: 'monthly',
        isActive: true,
    },
    // ==================== SELLER CHALLENGES ====================
    {
        title: 'First Sale',
        description: 'Make your first sale on VendorSpot. List products and start selling!',
        type: 'seller',
        targetType: 'sales',
        targetValue: 1,
        rewardType: 'points',
        rewardValue: 200,
        startDate: now,
        endDate: in30Days,
        isRecurring: false,
        isActive: true,
    },
    {
        title: 'Sales Machine',
        description: 'Reach 10 completed sales this week.',
        type: 'seller',
        targetType: 'sales',
        targetValue: 10,
        rewardType: 'cash',
        rewardValue: 1000,
        startDate: now,
        endDate: in7Days,
        isRecurring: true,
        recurringPeriod: 'weekly',
        isActive: true,
    },
    {
        title: 'Top Vendor',
        description: 'Get 50 completed sales this month and become a top vendor.',
        type: 'seller',
        targetType: 'sales',
        targetValue: 50,
        rewardType: 'cash',
        rewardValue: 5000,
        startDate: now,
        endDate: in30Days,
        isRecurring: true,
        recurringPeriod: 'monthly',
        isActive: true,
    },
    // ==================== AFFILIATE CHALLENGES ====================
    {
        title: 'Link Sharer',
        description: 'Get 20 clicks on your affiliate links this week.',
        type: 'affiliate',
        targetType: 'clicks',
        targetValue: 20,
        rewardType: 'points',
        rewardValue: 150,
        startDate: now,
        endDate: in7Days,
        isRecurring: true,
        recurringPeriod: 'weekly',
        isActive: true,
    },
    {
        title: 'Conversion King',
        description: 'Get 5 conversions from your affiliate links this month.',
        type: 'affiliate',
        targetType: 'conversions',
        targetValue: 5,
        rewardType: 'cash',
        rewardValue: 1500,
        startDate: now,
        endDate: in30Days,
        isRecurring: true,
        recurringPeriod: 'monthly',
        isActive: true,
    },
    {
        title: 'Affiliate Starter',
        description: 'Get your first conversion through an affiliate link.',
        type: 'affiliate',
        targetType: 'conversions',
        targetValue: 1,
        rewardType: 'cash',
        rewardValue: 300,
        startDate: now,
        endDate: in30Days,
        isRecurring: false,
        isActive: true,
    },
];
const seedChallenges = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }
        console.log('🔌 Connecting to MongoDB...');
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        // Check existing challenges
        const existingCount = await Additional_1.Challenge.countDocuments();
        console.log(`📊 Existing challenges: ${existingCount}`);
        if (existingCount > 0) {
            console.log('⚠️  Challenges already exist. Choose an option:');
            console.log('   Run with --force to delete existing and reseed');
            console.log('   Run with --append to add without deleting');
            const args = process.argv.slice(2);
            if (args.includes('--force')) {
                console.log('🗑️  Deleting existing challenges...');
                await Additional_1.Challenge.deleteMany({});
                console.log('✅ Existing challenges deleted');
            }
            else if (args.includes('--append')) {
                console.log('➕ Appending new challenges...');
            }
            else {
                console.log('❌ Aborting. Use --force or --append flag.');
                await mongoose_1.default.disconnect();
                process.exit(0);
            }
        }
        console.log(`🌱 Seeding ${challenges.length} challenges...`);
        for (const challenge of challenges) {
            const created = await Additional_1.Challenge.create(challenge);
            console.log(`  ✅ Created: ${created.title} (${created.type})`);
        }
        console.log('');
        console.log('🎉 Challenge seeding complete!');
        console.log('');
        // Summary
        const buyerCount = challenges.filter((c) => c.type === 'buyer').length;
        const sellerCount = challenges.filter((c) => c.type === 'seller').length;
        const affiliateCount = challenges.filter((c) => c.type === 'affiliate').length;
        console.log('📋 Summary:');
        console.log(`   🛒 Buyer challenges:    ${buyerCount}`);
        console.log(`   🏪 Seller challenges:   ${sellerCount}`);
        console.log(`   🔗 Affiliate challenges: ${affiliateCount}`);
        console.log(`   📦 Total:               ${challenges.length}`);
        await mongoose_1.default.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Seed error:', error);
        await mongoose_1.default.disconnect();
        process.exit(1);
    }
};
seedChallenges();
//# sourceMappingURL=challengeSeeds.js.map