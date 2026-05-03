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
export {};
//# sourceMappingURL=patch-migrated-to-pending.d.ts.map