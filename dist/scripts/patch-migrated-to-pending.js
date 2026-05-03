"use strict";
/**
 * One-time patch: set only MIGRATED users and products to pending status.
 *
 * Identifies migrated records by cross-referencing the old DB:
 * - Users/profiles → matched by email against the old DB's users collection
 * - Products       → identified by auto-generated VS- SKU prefix
 *
 * Run with:
 *   npx ts-node src/scripts/patch-migrated-to-pending.ts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const OLD_DB_URI = 'mongodb+srv://dave:Luv2laf1@vendorspot-production.pn1re.mongodb.net/VendorSpot-Production';
const NEW_DB_URI = process.env.MONGODB_URI;
const NEW_DB_NAME = 'test';
async function patch() {
    console.log('\n🔧  Patching migrated records to pending...\n');
    const oldClient = new mongodb_1.MongoClient(OLD_DB_URI);
    const newClient = new mongodb_1.MongoClient(NEW_DB_URI);
    await oldClient.connect();
    await newClient.connect();
    const oldDb = oldClient.db();
    const newDb = newClient.db(NEW_DB_NAME);
    // ── Get every email that was in the old DB (these are the migrated users) ──
    const oldUserDocs = await oldDb.collection('users')
        .find({}, { projection: { email: 1 } })
        .toArray();
    const migratedEmails = oldUserDocs
        .map((u) => u.email?.toLowerCase()?.trim())
        .filter(Boolean);
    console.log(`   Found ${migratedEmails.length} migrated user emails from old DB\n`);
    // ── 1. Migrated users → pending_verification ──────────────────────────────
    const usersResult = await newDb.collection('users').updateMany({ email: { $in: migratedEmails } }, { $set: { status: 'pending_verification' } });
    console.log(`✅  Users set to pending_verification: ${usersResult.modifiedCount}`);
    // ── 2. Migrated vendor profiles → verificationStatus: pending ─────────────
    // Find the new DB user IDs for the migrated emails
    const migratedNewUsers = await newDb.collection('users')
        .find({ email: { $in: migratedEmails } }, { projection: { _id: 1 } })
        .toArray();
    const migratedNewUserIds = migratedNewUsers.map((u) => u._id);
    const profilesResult = await newDb.collection('vendorprofiles').updateMany({ user: { $in: migratedNewUserIds } }, { $set: { verificationStatus: 'pending' } });
    console.log(`✅  Vendor profiles set to pending:    ${profilesResult.modifiedCount}`);
    // ── 3. Migrated products → pending_approval ───────────────────────────────
    // All migrated products have auto-generated SKUs starting with "VS-"
    const productsResult = await newDb.collection('products').updateMany({ sku: { $regex: /^VS-/ } }, { $set: { status: 'pending_approval' } });
    console.log(`✅  Products set to pending_approval:  ${productsResult.modifiedCount}`);
    await oldClient.close();
    await newClient.close();
    console.log('\n✅  Patch complete! Only migrated data was affected.\n');
}
patch().catch(console.error);
//# sourceMappingURL=patch-migrated-to-pending.js.map