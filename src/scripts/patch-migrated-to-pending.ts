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

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const OLD_DB_URI  = 'mongodb+srv://dave:Luv2laf1@vendorspot-production.pn1re.mongodb.net/VendorSpot-Production';
const NEW_DB_URI  = process.env.MONGODB_URI!;
const NEW_DB_NAME = 'test';

async function patch() {
  console.log('\n🔧  Patching migrated records to pending...\n');

  const oldClient = new MongoClient(OLD_DB_URI);
  const newClient = new MongoClient(NEW_DB_URI);

  await oldClient.connect();
  await newClient.connect();

  const oldDb = oldClient.db();
  const newDb  = newClient.db(NEW_DB_NAME);

  // ── Get every email that was in the old DB (these are the migrated users) ──
  const oldUserDocs = await oldDb.collection('users')
    .find({}, { projection: { email: 1 } })
    .toArray();

  const migratedEmails = oldUserDocs
    .map((u: any) => u.email?.toLowerCase()?.trim())
    .filter(Boolean) as string[];

  console.log(`   Found ${migratedEmails.length} migrated user emails from old DB\n`);

  // ── 1. Migrated users → pending_verification ──────────────────────────────
  const usersResult = await newDb.collection('users').updateMany(
    { email: { $in: migratedEmails } },
    { $set: { status: 'pending_verification' } }
  );
  console.log(`✅  Users set to pending_verification: ${usersResult.modifiedCount}`);

  // ── 2. Migrated vendor profiles → verificationStatus: pending ─────────────
  // Find the new DB user IDs for the migrated emails
  const migratedNewUsers = await newDb.collection('users')
    .find({ email: { $in: migratedEmails } }, { projection: { _id: 1 } })
    .toArray();
  const migratedNewUserIds = migratedNewUsers.map((u: any) => u._id);

  const profilesResult = await newDb.collection('vendorprofiles').updateMany(
    { user: { $in: migratedNewUserIds } },
    { $set: { verificationStatus: 'pending' } }
  );
  console.log(`✅  Vendor profiles set to pending:    ${profilesResult.modifiedCount}`);

  // ── 3. Migrated products → pending_approval ───────────────────────────────
  // All migrated products have auto-generated SKUs starting with "VS-"
  const productsResult = await newDb.collection('products').updateMany(
    { sku: { $regex: /^VS-/ } },
    { $set: { status: 'pending_approval' } }
  );
  console.log(`✅  Products set to pending_approval:  ${productsResult.modifiedCount}`);

  await oldClient.close();
  await newClient.close();

  console.log('\n✅  Patch complete! Only migrated data was affected.\n');
}

patch().catch(console.error);
