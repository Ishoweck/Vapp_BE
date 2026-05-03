/**
 * Migration script: VendorSpot old DB (Prisma/MongoDB) → new DB (Mongoose/MongoDB)
 *
 * Migrates in order: Users → Vendor Profiles → Categories → Products
 *
 * Run with:
 *   npx ts-node src/scripts/migrate-from-old-db.ts
 *
 * IMPORTANT: Verify NEW_DB_NAME matches your Atlas database name before running.
 * Check it in the MongoDB Atlas UI under your cluster's Collections tab.
 */
export {};
//# sourceMappingURL=migrate-from-old-db.d.ts.map