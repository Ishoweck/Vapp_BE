"use strict";
/**
 * Patch: activate all migrated users so they can log in.
 *
 * Sets status = 'active' and emailVerified = true for all users
 * whose emails existed in the old DB (i.e. migrated users).
 *
 * Run with:
 *   npx ts-node src/scripts/activate-migrated-users.ts
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
async function activate() {
    console.log('\n🔧  Activating migrated users...\n');
    if (!NEW_DB_URI)
        throw new Error('MONGODB_URI is not set in .env');
    const oldClient = new mongodb_1.MongoClient(OLD_DB_URI);
    const newClient = new mongodb_1.MongoClient(NEW_DB_URI);
    await oldClient.connect();
    await newClient.connect();
    const oldDb = oldClient.db();
    const newDb = newClient.db(NEW_DB_NAME);
    // Collect all emails from old DB
    const oldUserDocs = await oldDb.collection('users')
        .find({}, { projection: { email: 1, isDeleted: 1 } })
        .toArray();
    // Only activate non-deleted accounts
    const emailsToActivate = oldUserDocs
        .filter((u) => !u.isDeleted)
        .map((u) => u.email?.toLowerCase()?.trim())
        .filter(Boolean);
    console.log(`   Found ${emailsToActivate.length} eligible emails from old DB`);
    const result = await newDb.collection('users').updateMany({ email: { $in: emailsToActivate } }, { $set: { status: 'active', emailVerified: true } });
    console.log(`✅  Updated ${result.modifiedCount} users → status: active, emailVerified: true`);
    await oldClient.close();
    await newClient.close();
    console.log('\n✅  Done. Affected users can now log in.\n');
}
activate().catch(console.error);
//# sourceMappingURL=activate-migrated-users.js.map