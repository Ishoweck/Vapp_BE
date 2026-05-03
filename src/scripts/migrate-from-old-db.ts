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

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// ── Config ────────────────────────────────────────────────────────────────────

const OLD_DB_URI =
  'mongodb+srv://dave:Luv2laf1@vendorspot-production.pn1re.mongodb.net/VendorSpot-Production';

const NEW_DB_URI = process.env.MONGODB_URI!;

// Verify this matches your Atlas cluster's actual database name.
// Open Atlas → your cluster → Collections tab to confirm.
const NEW_DB_NAME = 'test';

// ── Field maps ────────────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, string> = {
  SuperAdmin: 'super_admin',
  Admin: 'admin',
  Vendor: 'vendor',
  Customer: 'customer',
};

const PRODUCT_STATUS_MAP: Record<string, string> = {
  Published: 'active',
  Draft: 'draft',
  Suspended: 'inactive',
  OutOfStock: 'active',
};

const VENDOR_STATUS_MAP: Record<string, string> = {
  Approved: 'approved',
  Rejected: 'rejected',
  Suspended: 'rejected',
  Pending: 'pending',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('\n🚀  Starting VendorSpot migration...\n');

  if (!NEW_DB_URI) {
    throw new Error('MONGODB_URI is not set in your .env file');
  }

  const oldClient = new MongoClient(OLD_DB_URI);
  const newClient = new MongoClient(NEW_DB_URI);

  try {
    await oldClient.connect();
    await newClient.connect();
    console.log('✅  Connected to both databases\n');

    const oldDb = oldClient.db(); // reads from VendorSpot-Production (in URI)
    const newDb = newClient.db(NEW_DB_NAME);

    // Maps: old string ID → new ObjectId (needed to wire up relations)
    const userIdMap = new Map<string, ObjectId>();
    const categoryIdMap = new Map<string, ObjectId>();
    // old shop._id string → old shop.userId string (used to resolve products via shop_id)
    const shopIdToOldUserIdMap = new Map<string, string>();

    // ── Fix indexes on new DB before inserting ────────────────────────────────
    // The Mongoose User model does NOT define a unique index on phone.
    // Any phone_1 index is a leftover — drop it so users without a phone number
    // can be inserted freely (many old users have no phone).
    try {
      await newDb.collection('users').dropIndex('phone_1');
      console.log('ℹ️   Dropped stale phone index on users collection');
    } catch (_) { /* index didn't exist — fine */ }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 1: USERS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('── STEP 1: Users ─────────────────────────────');

    const oldUsers = await oldDb.collection('users').find({}).toArray();
    let usersCreated = 0;
    let usersSkipped = 0;

    // Load all existing emails from new DB in one query instead of 1 query per user
    const existingNewUsers = await newDb.collection('users')
      .find({}, { projection: { email: 1 } })
      .toArray();
    const existingEmailMap = new Map<string, ObjectId>(
      existingNewUsers.map((u: any) => [u.email as string, u._id as ObjectId])
    );

    // Separate users that already exist from users to insert
    const toInsert: Array<{ doc: Record<string, any>; oldId: string }> = [];

    for (const u of oldUsers) {
      const email = u.email?.toLowerCase()?.trim();
      if (!email) { usersSkipped++; continue; }

      if (existingEmailMap.has(email)) {
        userIdMap.set(u._id.toString(), existingEmailMap.get(email)!);
        usersSkipped++;
        continue;
      }

      const firstName = (u.firstname || u.name?.split(' ')[0] || 'Unknown').trim();
      const lastName  = (u.lastname  || u.name?.split(' ').slice(1).join(' ') || 'User').trim();

      toInsert.push({
        oldId: u._id.toString(),
        doc: {
          firstName,
          lastName,
          email,
          ...(u.phoneNumber ? { phone: u.phoneNumber } : {}),
          password:      u.password    || undefined,
          role:          ROLE_MAP[u.role] || 'customer',
          status:        u.isDeleted
                           ? 'inactive'
                           : u.emailVerified
                             ? 'active'
                             : 'pending_verification',
          avatar:        u.image || null,
          emailVerified: !!u.emailVerified,
          phoneVerified: false,
          otp:           {},
          points:        0,
          badges:        [],
          achievements:  [],
          isAffiliate:   false,
          fcmTokens:     [],
          loginStreak:   { currentStreak: 0, lastLoginDate: null },
          notificationPreferences: {
            pushEnabled: true,
            order:  [],
            promo:  [],
            social: [],
          },
          createdAt: u.createdAt || new Date(),
          updatedAt: u.updatedAt || new Date(),
        },
      });
    }

    // Single bulk insert instead of 1,433 individual inserts
    if (toInsert.length > 0) {
      const result = await newDb.collection('users').insertMany(
        toInsert.map(item => item.doc),
        { ordered: false } // continue on duplicate errors
      );
      for (const [idx, newId] of Object.entries(result.insertedIds)) {
        userIdMap.set(toInsert[Number(idx)].oldId, newId as ObjectId);
        usersCreated++;
      }
    }

    // Also record skipped users in the map (already existed in new DB)
    usersSkipped = oldUsers.length - toInsert.length;

    console.log(`   Created: ${usersCreated}  |  Skipped (duplicate email): ${usersSkipped}`);
    console.log(`   userIdMap size: ${userIdMap.size} entries\n`);

    if (userIdMap.size === 0) {
      console.warn('   ⚠️  WARNING: userIdMap is empty — old DB may have 0 users or a different collection name.\n');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 2: VENDOR PROFILES  (old `shop` collection)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('── STEP 2: Vendor Profiles ───────────────────');

    const oldShops = await oldDb.collection('shop').find({}).toArray();
    let shopsCreated = 0;
    let shopsSkipped = 0;

    for (const shop of oldShops) {
      const oldUserId = shop.userId?.toString();
      const shopId    = shop._id.toString();

      // Always record the mapping — products need it even if the vendor profile is skipped
      if (oldUserId) shopIdToOldUserIdMap.set(shopId, oldUserId);

      const newUserId = oldUserId ? userIdMap.get(oldUserId) : null;

      if (!newUserId) {
        console.warn(`   ⚠️   No matching user for shop "${shop.shopName}" — skipping`);
        shopsSkipped++;
        continue;
      }

      const alreadyExists = await newDb.collection('vendorprofiles').findOne({ user: newUserId });
      if (alreadyExists) {
        shopsSkipped++;
        continue;
      }

      // Fetch related sub-documents from the old DB
      const address      = await oldDb.collection('Address').findOne({ shopId });
      const paymentInfo  = await oldDb.collection('PaymentInfo').findOne({ shopId });
      const shopSettings = await oldDb.collection('ShopSettings').findOne({ shopId });
      const oldUser      = await oldDb.collection('users').findOne({ _id: shop.userId });

      const vendorProfile: Record<string, any> = {
        user:                newUserId,
        businessName:        shop.shopName  || 'My Shop',
        businessDescription: shop.description || '',
        businessLogo:        shop.logo   || null,
        businessBanner:      shop.banner || null,
        businessAddress: {
          street:  address?.street  || 'To be updated',
          city:    address?.city    || 'To be updated',
          state:   address?.state   || 'To be updated',
          country: address?.country || 'Nigeria',
        },
        // Pull phone from ShopSettings first, then user, then placeholder
        businessPhone:   shopSettings?.phoneNumber || oldUser?.phoneNumber || 'To be updated',
        businessEmail:   oldUser?.email            || 'To be updated',
        businessWebsite: shopSettings?.website     || null,
        // Old `documents` is a raw string array — map to KYC doc objects.
        // Type defaults to ID_CARD; vendor can correct it in the dashboard.
        kycDocuments: (shop.documents || []).map((url: string) => ({
          type:               'ID_CARD',
          documentUrl:        url,
          verificationStatus: 'pending',
        })),
        verificationStatus: VENDOR_STATUS_MAP[shop.status] || 'pending',
        verifiedAt:         shop.status === 'Approved' ? shop.updatedAt : null,
        payoutDetails:      paymentInfo
          ? {
              bankName:      paymentInfo.bankName,
              accountNumber: paymentInfo.accountNumber,
              accountName:   paymentInfo.accountName,
            }
          : undefined,
        followers:       [],
        commissionRate:  5,
        totalSales:      0,
        totalOrders:     0,
        averageRating:   0,
        totalReviews:    0,
        isPremium:       false,
        isActive:        shop.status !== 'Suspended',
        storefront:      { theme: null, bannerImages: [], customMessage: null },
        socialMedia:     {},
        createdAt:       shop.createdAt || new Date(),
        updatedAt:       shop.updatedAt || new Date(),
      };

      await newDb.collection('vendorprofiles').insertOne(vendorProfile);
      shopsCreated++;
    }

    console.log(`   Created: ${shopsCreated}  |  Skipped: ${shopsSkipped}\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 3: CATEGORIES
    // ──────────────────────────────────────────────────────────────────────────
    console.log('── STEP 3: Categories ────────────────────────');

    const oldCategories = await oldDb.collection('category').find({}).toArray();
    let catsCreated = 0;
    let catsSkipped = 0;

    // Top-level categories first so parent IDs are ready for subcategories
    const topLevel = oldCategories.filter((c: any) => !c.parentId);
    const subLevel = oldCategories.filter((c: any) => !!c.parentId);

    for (const cat of [...topLevel, ...subLevel]) {
      const slug = cat.slug || toSlug(cat.name);

      const existing = await newDb.collection('categories').findOne({ slug });
      if (existing) {
        categoryIdMap.set(cat._id.toString(), existing._id as ObjectId);
        catsSkipped++;
        continue;
      }

      const parentId = cat.parentId ? categoryIdMap.get(cat.parentId.toString()) : null;

      const result = await newDb.collection('categories').insertOne({
        name:         cat.name,
        slug,
        parent:       parentId || null,
        level:        parentId ? 1 : 0,
        isActive:     true,
        order:        0,
        productCount: 0,
        createdAt:    new Date(),
        updatedAt:    new Date(),
      });

      categoryIdMap.set(cat._id.toString(), result.insertedId);
      catsCreated++;
    }

    console.log(`   Created: ${catsCreated}  |  Skipped (already exist): ${catsSkipped}\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // STEP 4: PRODUCTS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('── STEP 4: Products ──────────────────────────');

    // Ensure a fallback "Uncategorized" category exists
    let uncategorizedId: ObjectId;
    const uncatDoc = await newDb.collection('categories').findOne({ slug: 'uncategorized' });
    if (uncatDoc) {
      uncategorizedId = uncatDoc._id as ObjectId;
    } else {
      const r = await newDb.collection('categories').insertOne({
        name: 'Uncategorized', slug: 'uncategorized',
        level: 0, isActive: true, order: 999, productCount: 0,
        createdAt: new Date(), updatedAt: new Date(),
      });
      uncategorizedId = r.insertedId;
    }

    // ── Diagnostics (printed before the product loop so you always see them) ──
    const oldCollections = await oldDb.listCollections().toArray();
    console.log(`   OLD DB collections: ${oldCollections.map((c: any) => c.name).join(', ')}`);
    const oldUserCount = await oldDb.collection('users').countDocuments();
    console.log(`   OLD DB "users" collection: ${oldUserCount} docs`);
    console.log(`   userIdMap size: ${userIdMap.size}`);
    console.log(`   shopIdToOldUserIdMap size: ${shopIdToOldUserIdMap.size}`);

    // Sample one product to show what user_id looks like at the raw driver level
    const sampleProduct = await oldDb.collection('product').findOne({ user_id: { $ne: null } });
    if (sampleProduct) {
      console.log(`   Sample product user_id raw value: ${JSON.stringify(sampleProduct.user_id)} (type: ${typeof sampleProduct.user_id})`);
      // Try to find the user in old DB directly
      const tryUserId = sampleProduct.user_id;
      const foundUser = await oldDb.collection('users').findOne({ _id: tryUserId }) ||
                        await oldDb.collection('users').findOne({ _id: tryUserId });
      console.log(`   User found in old DB for that product: ${foundUser ? foundUser.email : 'NOT FOUND'}`);
    }
    console.log('');

    const oldProducts = await oldDb
      .collection('product')
      .find({ isDeleted: { $ne: true } })
      .toArray();

    let productsCreated = 0;
    let productsSkipped = 0;

    for (const p of oldProducts) {
      // Products link to a vendor via user_id directly, or via shop_id → shop.userId.
      const directUserId      = p.user_id?.toString();
      const shopOwnerId       = p.shop_id?.toString()
        ? shopIdToOldUserIdMap.get(p.shop_id.toString())
        : undefined;
      const resolvedOldUserId = directUserId || shopOwnerId;

      // Primary: fast map lookup built in Step 1 & 2
      let newVendorId: ObjectId | null | undefined = resolvedOldUserId
        ? userIdMap.get(resolvedOldUserId)
        : null;

      // Fallback: map miss means the user wasn't in the old `user` collection when
      // Step 1 ran (e.g. they were already in the new DB from a previous partial run,
      // or the old _id type didn't match). Re-resolve via email.
      if (!newVendorId && resolvedOldUserId) {
        try {
          const oldUserDoc = await oldDb.collection('users').findOne({
            _id: new ObjectId(resolvedOldUserId),
          });
          if (oldUserDoc?.email) {
            const newUserDoc = await newDb.collection('users').findOne({
              email: oldUserDoc.email.toLowerCase().trim(),
            });
            if (newUserDoc) {
              newVendorId = newUserDoc._id as ObjectId;
              userIdMap.set(resolvedOldUserId, newVendorId); // cache so later products are fast
            }
          }
        } catch (_) {
          // resolvedOldUserId was not a valid ObjectId hex string — skip fallback
        }
      }

      if (!newVendorId) {
        console.warn(`   ⚠️   No matching vendor for product "${p.name}" — skipping`);
        productsSkipped++;
        continue;
      }

      // ── Resolve category ──
      let categoryId: ObjectId = uncategorizedId;
      if (p.category) {
        const catByName = await newDb.collection('categories').findOne({
          name: { $regex: new RegExp(`^${escapeRegex(p.category)}$`, 'i') },
        });
        if (catByName) {
          categoryId = catByName._id as ObjectId;
        } else {
          // Category name exists in product but not in categories collection — create it
          const slug = toSlug(p.category);
          const catBySlug = await newDb.collection('categories').findOne({ slug });
          if (catBySlug) {
            categoryId = catBySlug._id as ObjectId;
          } else {
            const r = await newDb.collection('categories').insertOne({
              name: p.category, slug,
              level: 0, isActive: true, order: 0, productCount: 0,
              createdAt: new Date(), updatedAt: new Date(),
            });
            categoryId = r.insertedId;
          }
        }
      }

      // ── Build images array (old DB: single `image` + `gallery[]`) ──
      const images = [p.image, ...(p.gallery || [])].filter(Boolean) as string[];
      if (images.length === 0) {
        console.warn(`   ⚠️   Product "${p.name}" has no images — skipping`);
        productsSkipped++;
        continue;
      }

      // ── Ensure unique slug ──
      let slug = p.slug || toSlug(p.name);
      const slugConflict = await newDb.collection('products').findOne({ slug });
      if (slugConflict) slug = `${slug}-${p._id.toString().slice(-4)}`;

      // ── Generate SKU (old DB has none) ──
      const baseSku    = `VS-${p._id.toString().slice(-8).toUpperCase()}`;
      const skuConflict = await newDb.collection('products').findOne({ sku: baseSku });
      const sku         = skuConflict ? `VS-${p._id.toString().toUpperCase()}` : baseSku;

      // ── Map variants ──
      const oldVariants = await oldDb
        .collection('Variant')
        .find({ productId: p._id.toString() })
        .toArray();

      const variants = oldVariants.map((v: any) => {
        const attrs = v.attributes || {};
        return {
          name:           Object.values(attrs).join(' / ') || 'Default',
          price:          v.price          ?? p.price ?? 0,
          compareAtPrice: v.sale_price     || undefined,
          sku:            `${sku}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          quantity:       v.quantity        ?? 0,
          attributes:     attrs,
        };
      });

      const newProduct: Record<string, any> = {
        name:              p.name,
        slug,
        description:       p.description || '',
        vendor:            newVendorId,
        category:          categoryId,
        productType:       'physical',
        price:             p.price    ?? p.minPrice ?? 0,
        compareAtPrice:    p.sale_price             || undefined,
        sku,
        quantity:          p.quantity ?? p.stock    ?? 0,
        lowStockThreshold: 10,
        images,
        videos:            [],
        variants,
        tags:              [],
        colors:            [],
        keyFeatures:       [],
        specifications:    {},
        status:            PRODUCT_STATUS_MAP[p.status] || 'draft',
        isFlashSale:       p.isFlashDeal  || false,
        isFeatured:        p.isFeatured   || false,
        isAffiliate:       true,
        affiliateCommission: 10,
        averageRating:     0,
        totalReviews:      0,
        totalSales:        0,
        views:             0,
        seo:               { keywords: [] },
        createdAt:         p.createdAt || new Date(),
        updatedAt:         p.updatedAt || new Date(),
      };

      await newDb.collection('products').insertOne(newProduct);
      productsCreated++;
    }

    console.log(`   Created: ${productsCreated}  |  Skipped: ${productsSkipped}\n`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════');
    console.log('✅  Migration complete!');
    console.log(`    Users migrated:            ${usersCreated}`);
    console.log(`    Vendor profiles migrated:  ${shopsCreated}`);
    console.log(`    Categories migrated:       ${catsCreated}`);
    console.log(`    Products migrated:         ${productsCreated}`);
    console.log('═══════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌  Migration failed:', err);
    throw err;
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

migrate();
