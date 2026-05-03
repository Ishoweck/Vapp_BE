/**
 * Patch: activate all migrated users so they can log in.
 *
 * Sets status = 'active' and emailVerified = true for all users
 * whose emails existed in the old DB (i.e. migrated users).
 *
 * Run with:
 *   npx ts-node src/scripts/activate-migrated-users.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const OLD_DB_URI  = 'mongodb+srv://dave:Luv2laf1@vendorspot-production.pn1re.mongodb.net/VendorSpot-Production';
const NEW_DB_URI  = process.env.MONGODB_URI!;
const NEW_DB_NAME = 'test';

async function activate() {
  console.log('\n🔧  Activating migrated users...\n');

  if (!NEW_DB_URI) throw new Error('MONGODB_URI is not set in .env');

  const oldClient = new MongoClient(OLD_DB_URI);
  const newClient = new MongoClient(NEW_DB_URI);

  await oldClient.connect();
  await newClient.connect();

  const oldDb = oldClient.db();
  const newDb  = newClient.db(NEW_DB_NAME);

  // Collect all emails from old DB
  const oldUserDocs = await oldDb.collection('users')
    .find({}, { projection: { email: 1, isDeleted: 1 } })
    .toArray();

  // Only activate non-deleted accounts
  const emailsToActivate = oldUserDocs
    .filter((u: any) => !u.isDeleted)
    .map((u: any) => u.email?.toLowerCase()?.trim())
    .filter(Boolean) as string[];

  console.log(`   Found ${emailsToActivate.length} eligible emails from old DB`);

  const result = await newDb.collection('users').updateMany(
    { email: { $in: emailsToActivate } },
    { $set: { status: 'active', emailVerified: true } }
  );

  console.log(`✅  Updated ${result.modifiedCount} users → status: active, emailVerified: true`);

  await oldClient.close();
  await newClient.close();

  console.log('\n✅  Done. Affected users can now log in.\n');
}

activate().catch(console.error);
