"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productController = exports.ProductController = void 0;
const types_1 = require("../types");
const Product_1 = __importDefault(require("../models/Product"));
const Category_1 = __importDefault(require("../models/Category"));
const VendorProfile_1 = __importDefault(require("../models/VendorProfile"));
const error_1 = require("../middleware/error");
const helpers_1 = require("../utils/helpers");
const cloudinary_1 = require("../utils/cloudinary");
const notification_service_1 = require("../services/notification.service");
class ProductController {
    // COMPLETE FIXED createProduct method for product.controller.ts
    async createProduct(req, res) {
        try {
            const productData = req.body;
            // Set vendor from authenticated user
            productData.vendor = req.user?.id;
            // Generate slug and SKU
            productData.slug = (0, helpers_1.generateSlug)(productData.name);
            if (!productData.sku) {
                productData.sku = (0, helpers_1.generateSKU)(productData.name);
            }
            // ✅ UPLOAD IMAGES TO CLOUDINARY
            if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
                console.log(`📸 Uploading ${productData.images.length} images to Cloudinary...`);
                // Upload base64 images to Cloudinary
                const cloudinaryUrls = await (0, cloudinary_1.uploadMultipleToCloudinary)(productData.images, `products/${req.user?.id}`);
                productData.images = cloudinaryUrls;
                console.log(`✅ Images uploaded successfully:`, cloudinaryUrls);
            }
            else {
                throw new error_1.AppError('At least one product image is required', 400);
            }
            // ✅ UPLOAD DIGITAL FILE FOR DIGITAL PRODUCTS (if provided)
            if (productData.productType === 'digital' && productData.digitalFileBase64) {
                console.log('📁 Uploading digital file to Cloudinary...');
                const digitalFileResult = await (0, cloudinary_1.uploadToCloudinary)(productData.digitalFileBase64, `digital-products/${req.user?.id}`);
                // Extract file info from base64 string
                const fileTypeMatch = productData.digitalFileBase64.match(/data:([^;]+);/);
                const fileType = fileTypeMatch ? fileTypeMatch[1] : 'application/octet-stream';
                const fileSize = Math.round((productData.digitalFileBase64.length * 0.75));
                productData.digitalFile = {
                    url: digitalFileResult.url,
                    fileName: productData.digitalFileName || 'digital-file',
                    fileSize: fileSize,
                    fileType: fileType,
                    version: productData.digitalFileVersion || '1.0',
                    uploadedAt: new Date(),
                };
                // Remove temporary fields
                delete productData.digitalFileBase64;
                delete productData.digitalFileName;
                delete productData.digitalFileVersion;
                console.log('✅ Digital file uploaded successfully');
            }
            console.log('📦 Creating product in database...');
            // Create product in database
            const product = await Product_1.default.create(productData);
            console.log('✅ Product created:', product._id);
            // Update category product count
            if (product.category) {
                await Category_1.default.findByIdAndUpdate(product.category, {
                    $inc: { productCount: 1 },
                });
                console.log('✅ Category product count updated');
            }
            // Format product for response
            const formattedProduct = this.formatProduct(product);
            // Notify vendor followers about new product
            try {
                const vendorProfile = await VendorProfile_1.default.findOne({ user: req.user?.id }).select('followers businessName');
                if (vendorProfile && vendorProfile.followers && vendorProfile.followers.length > 0) {
                    const followerIds = vendorProfile.followers.map((f) => f.toString());
                    await notification_service_1.notificationService.newProductFromFollowedVendor(followerIds, vendorProfile.businessName || 'A vendor you follow', product.name, product._id.toString());
                }
            }
            catch (error) {
                console.error('Error sending new product notification:', error);
            }
            console.log('✅ Sending success response to frontend');
            // ✅ SEND RESPONSE
            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: { product: formattedProduct },
            });
        }
        catch (error) {
            console.error('❌ Error creating product:', error);
            console.error('Error details:', error.message);
            console.error('Stack:', error.stack);
            // Send error response
            if (!res.headersSent) {
                res.status(error.statusCode || 500).json({
                    success: false,
                    message: error.message || 'Failed to create product',
                    error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                });
            }
        }
    }
    async getProducts(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = { status: types_1.ProductStatus.ACTIVE };
        // Filters
        if (req.query.category)
            filter.category = req.query.category;
        if (req.query.vendor)
            filter.vendor = req.query.vendor;
        if (req.query.productType)
            filter.productType = req.query.productType;
        if (req.query.inStock !== undefined) {
            filter.quantity = req.query.inStock === 'true' ? { $gt: 0 } : 0;
        }
        // Price range
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice)
                filter.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice)
                filter.price.$lte = Number(req.query.maxPrice);
        }
        // Rating
        if (req.query.rating) {
            filter.averageRating = { $gte: Number(req.query.rating) };
        }
        // Search
        if (req.query.search) {
            filter.$text = { $search: req.query.search };
        }
        // Sort
        let sort = { createdAt: -1 };
        switch (req.query.sort) {
            case 'price_asc':
                sort = { price: 1 };
                break;
            case 'price_desc':
                sort = { price: -1 };
                break;
            case 'rating':
                sort = { averageRating: -1 };
                break;
            case 'newest':
                sort = { createdAt: -1 };
                break;
            case 'popular':
                sort = { totalSales: -1, views: -1 };
                break;
        }
        const products = await Product_1.default.find(filter)
            .populate('vendor', 'firstName lastName profileImage')
            .populate('category', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
        const total = await Product_1.default.countDocuments(filter);
        const meta = (0, helpers_1.getPaginationMeta)(total, page, limit);
        // Format products for frontend
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'Products fetched successfully',
            data: {
                products: formattedProducts,
                total,
                page,
                limit,
                hasMore: skip + products.length < total
            },
            meta,
        });
    }
    async getProduct(req, res) {
        const product = await Product_1.default.findById(req.params.id)
            .populate('vendor', 'firstName lastName email profileImage')
            .populate('category', 'name');
        if (!product) {
            throw new error_1.AppError('Product not found', 404);
        }
        // Increment views
        product.views += 1;
        await product.save();
        res.json({
            success: true,
            message: 'Product fetched successfully',
            data: this.formatProduct(product),
        });
    }
    // NEW: Get My Products (for authenticated vendor)
    async getMyProducts(req, res) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Get authenticated vendor's ID
        const vendorId = req.user?.id;
        if (!vendorId) {
            throw new error_1.AppError('User not authenticated', 401);
        }
        // Build filter for vendor's products
        const filter = {
            vendor: vendorId
            // NOTE: We DON'T filter by status here so vendors can see all their products
            // including inactive/draft ones
        };
        // Optional filters
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.productType) {
            filter.productType = req.query.productType;
        }
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        // Sort options
        let sort = { createdAt: -1 };
        switch (req.query.sort) {
            case 'price_asc':
                sort = { price: 1 };
                break;
            case 'price_desc':
                sort = { price: -1 };
                break;
            case 'name':
                sort = { name: 1 };
                break;
            case 'stock':
                sort = { quantity: -1 };
                break;
            case 'newest':
                sort = { createdAt: -1 };
                break;
            case 'oldest':
                sort = { createdAt: 1 };
                break;
        }
        const products = await Product_1.default.find(filter)
            .populate('vendor', 'firstName lastName profileImage')
            .populate('category', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
        const total = await Product_1.default.countDocuments(filter);
        const meta = (0, helpers_1.getPaginationMeta)(total, page, limit);
        // Calculate stock statistics
        const allProducts = await Product_1.default.find({ vendor: vendorId }).lean();
        const stockStats = {
            total: allProducts.length,
            active: allProducts.filter(p => p.status === types_1.ProductStatus.ACTIVE).length,
            inactive: allProducts.filter(p => p.status === types_1.ProductStatus.INACTIVE).length,
            lowStock: allProducts.filter(p => p.quantity > 0 && p.quantity <= 10).length,
            outOfStock: allProducts.filter(p => p.quantity === 0).length,
        };
        // Format products for frontend
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'Your products fetched successfully',
            data: {
                products: formattedProducts,
                total,
                page,
                limit,
                hasMore: skip + products.length < total,
                stats: stockStats
            },
            meta,
        });
    }
    // NEW: Get Recommended Products
    async getRecommendedProducts(req, res) {
        const limit = parseInt(req.query.limit) || 10;
        // Get user's browsing history, preferences, etc.
        // For now, return top-rated in-stock products
        const products = await Product_1.default.find({
            status: types_1.ProductStatus.ACTIVE,
            quantity: { $gt: 0 }
        })
            .populate('vendor', 'firstName lastName profileImage')
            .populate('category', 'name')
            .sort({ averageRating: -1, totalSales: -1, views: -1 })
            .limit(limit)
            .lean();
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'Recommended products fetched successfully',
            data: {
                products: formattedProducts,
                total: products.length,
                page: 1,
                limit,
                hasMore: false
            }
        });
    }
    // NEW: Get Featured Products
    async getFeaturedProducts(req, res) {
        const limit = parseInt(req.query.limit) || 10;
        const products = await Product_1.default.find({
            status: types_1.ProductStatus.ACTIVE,
            isFeatured: true,
            quantity: { $gt: 0 }
        })
            .populate('vendor', 'firstName lastName profileImage')
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'Featured products fetched successfully',
            data: {
                products: formattedProducts,
                total: products.length,
                page: 1,
                limit,
                hasMore: false
            }
        });
    }
    // NEW: Get Products by Category
    async getProductsByCategory(req, res) {
        const { categoryId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const products = await Product_1.default.find({
            status: types_1.ProductStatus.ACTIVE,
            category: categoryId
        })
            .populate('vendor', 'firstName lastName profileImage')
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const total = await Product_1.default.countDocuments({
            status: types_1.ProductStatus.ACTIVE,
            category: categoryId
        });
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'Category products fetched successfully',
            data: {
                products: formattedProducts,
                total,
                page,
                limit,
                hasMore: skip + products.length < total
            }
        });
    }
    // NEW: Search Products
    async searchProducts(req, res) {
        const query = req.query.q;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        if (!query) {
            throw new error_1.AppError('Search query is required', 400);
        }
        const products = await Product_1.default.find({
            status: types_1.ProductStatus.ACTIVE,
            $text: { $search: query }
        })
            .populate('vendor', 'firstName lastName profileImage')
            .populate('category', 'name')
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip)
            .limit(limit)
            .lean();
        const total = await Product_1.default.countDocuments({
            status: types_1.ProductStatus.ACTIVE,
            $text: { $search: query }
        });
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'Search results fetched successfully',
            data: {
                products: formattedProducts,
                total,
                page,
                limit,
                hasMore: skip + products.length < total,
                query
            }
        });
    }
    // NEW: Get New Arrivals
    async getNewArrivals(req, res) {
        const limit = parseInt(req.query.limit) || 10;
        // Products created in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const products = await Product_1.default.find({
            status: types_1.ProductStatus.ACTIVE,
            createdAt: { $gte: thirtyDaysAgo },
            quantity: { $gt: 0 }
        })
            .populate('vendor', 'firstName lastName profileImage')
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'New arrivals fetched successfully',
            data: {
                products: formattedProducts,
                total: products.length,
                page: 1,
                limit,
                hasMore: false
            }
        });
    }
    // NEW: Get Products On Sale
    async getProductsOnSale(req, res) {
        const limit = parseInt(req.query.limit) || 10;
        // Products with compareAtPrice set (indicating discount)
        const products = await Product_1.default.find({
            status: types_1.ProductStatus.ACTIVE,
            compareAtPrice: { $exists: true, $gt: 0 },
            $expr: { $lt: ['$price', '$compareAtPrice'] },
            quantity: { $gt: 0 }
        })
            .populate('vendor', 'firstName lastName profileImage')
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'Sale products fetched successfully',
            data: {
                products: formattedProducts,
                total: products.length,
                page: 1,
                limit,
                hasMore: false
            }
        });
    }
    // NEW: Get Vendor Products
    async getVendorProducts(req, res) {
        const { vendorId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const products = await Product_1.default.find({
            status: types_1.ProductStatus.ACTIVE,
            vendor: vendorId
        })
            .populate('vendor', 'firstName lastName profileImage')
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const total = await Product_1.default.countDocuments({
            status: types_1.ProductStatus.ACTIVE,
            vendor: vendorId
        });
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'Vendor products fetched successfully',
            data: {
                products: formattedProducts,
                total,
                page,
                limit,
                hasMore: skip + products.length < total
            }
        });
    }
    // NEW: Get Trending Products
    async getTrendingProducts(req, res) {
        const limit = parseInt(req.query.limit) || 10;
        // Trending = high sales + views in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const products = await Product_1.default.find({
            status: types_1.ProductStatus.ACTIVE,
            quantity: { $gt: 0 },
            updatedAt: { $gte: sevenDaysAgo }
        })
            .populate('vendor', 'firstName lastName profileImage')
            .populate('category', 'name')
            .sort({ totalSales: -1, views: -1, averageRating: -1 })
            .limit(limit)
            .lean();
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'Trending products fetched successfully',
            data: {
                products: formattedProducts,
                total: products.length,
                page: 1,
                limit,
                hasMore: false
            }
        });
    }
    // Add this method to your ProductController class in product.controller.ts
    /**
     * Get Similar Products
     * Returns products from the same category and/or vendor, excluding the current product
     */
    async getSimilarProducts(req, res) {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        // Get the current product to find its category and vendor
        const currentProduct = await Product_1.default.findById(id).lean();
        if (!currentProduct) {
            throw new error_1.AppError('Product not found', 404);
        }
        // Strategy: same category first, then same vendor, then fallback to popular
        let products = [];
        // 1. Same category products (excluding current)
        if (currentProduct.category) {
            const categoryProducts = await Product_1.default.find({
                _id: { $ne: id },
                status: types_1.ProductStatus.ACTIVE,
                category: currentProduct.category,
                quantity: { $gt: 0 },
            })
                .populate('vendor', 'firstName lastName profileImage')
                .populate('category', 'name')
                .sort({ averageRating: -1, totalSales: -1 })
                .limit(limit)
                .lean();
            products = categoryProducts;
        }
        // 2. If not enough, fill with same vendor products
        if (products.length < limit) {
            const existingIds = [id, ...products.map((p) => p._id.toString())];
            const remaining = limit - products.length;
            const vendorProducts = await Product_1.default.find({
                _id: { $nin: existingIds },
                status: types_1.ProductStatus.ACTIVE,
                vendor: currentProduct.vendor,
                quantity: { $gt: 0 },
            })
                .populate('vendor', 'firstName lastName profileImage')
                .populate('category', 'name')
                .sort({ averageRating: -1, totalSales: -1 })
                .limit(remaining)
                .lean();
            products = [...products, ...vendorProducts];
        }
        // 3. If still not enough, fill with popular products
        if (products.length < limit) {
            const existingIds = [id, ...products.map((p) => p._id.toString())];
            const remaining = limit - products.length;
            const popularProducts = await Product_1.default.find({
                _id: { $nin: existingIds },
                status: types_1.ProductStatus.ACTIVE,
                quantity: { $gt: 0 },
            })
                .populate('vendor', 'firstName lastName profileImage')
                .populate('category', 'name')
                .sort({ totalSales: -1, views: -1, averageRating: -1 })
                .limit(remaining)
                .lean();
            products = [...products, ...popularProducts];
        }
        const formattedProducts = products.map(this.formatProduct);
        res.json({
            success: true,
            message: 'Similar products fetched successfully',
            data: {
                products: formattedProducts,
                total: formattedProducts.length,
            },
        });
    }
    async updateProduct(req, res) {
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            throw new error_1.AppError('Product not found', 404);
        }
        if (product.vendor.toString() !== req.user?.id) {
            throw new error_1.AppError('Not authorized', 403);
        }
        const oldPrice = product.price;
        Object.assign(product, req.body);
        await product.save();
        // Notify wishlisted users about price drop
        if (req.body.price && req.body.price < oldPrice) {
            try {
                const { Wishlist } = await Promise.resolve().then(() => __importStar(require('../models/Additional')));
                const wishlists = await Wishlist.find({ 'items.product': product._id }).select('user');
                const userIds = wishlists.map((w) => w.user.toString());
                if (userIds.length > 0) {
                    await notification_service_1.notificationService.priceDrop(userIds, product.name, oldPrice, req.body.price, product._id.toString());
                }
            }
            catch (error) {
                console.error('Error sending price drop notification:', error);
            }
        }
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: { product },
        });
    }
    async deleteProduct(req, res) {
        const product = await Product_1.default.findById(req.params.id);
        if (!product) {
            throw new error_1.AppError('Product not found', 404);
        }
        if (product.vendor.toString() !== req.user?.id) {
            throw new error_1.AppError('Not authorized', 403);
        }
        await product.deleteOne();
        await Category_1.default.findByIdAndUpdate(product.category, {
            $inc: { productCount: -1 },
        });
        res.json({
            success: true,
            message: 'Product deleted successfully',
        });
    }
    // Add this to your ProductController class
    // Updated Helper method to format product for frontend
    formatProduct(product) {
        // Calculate discount percentage
        let discountPercentage = null;
        if (product.compareAtPrice && product.compareAtPrice > product.price) {
            const discount = Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
            discountPercentage = `-${discount}%`;
        }
        // Convert specifications Map to object if it exists
        let specifications = {};
        if (product.specifications) {
            if (product.specifications instanceof Map) {
                specifications = Object.fromEntries(product.specifications);
            }
            else {
                specifications = product.specifications;
            }
        }
        return {
            id: product._id.toString(),
            name: product.name,
            description: product.description,
            shortDescription: product.shortDescription,
            price: product.price,
            originalPrice: product.compareAtPrice,
            discount: product.compareAtPrice ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0,
            discountPercentage,
            rating: product.averageRating || 0,
            reviews: product.totalReviews || 0,
            images: product.images || [],
            thumbnail: product.images?.[0] || '',
            category: product.category?.name || 'Uncategorized',
            categoryId: product.category?._id?.toString() || '',
            vendor: {
                id: product.vendor?._id?.toString() || '',
                name: product.vendor ? `${product.vendor.firstName} ${product.vendor.lastName}` : 'Unknown',
                image: product.vendor?.profileImage || ''
            },
            stock: product.quantity || 0,
            inStock: (product.quantity || 0) > 0,
            tags: product.tags || [],
            productType: product.productType,
            isFeatured: product.isFeatured || false,
            isAffiliate: product.isAffiliate || false,
            affiliateCommission: product.affiliateCommission || 0,
            totalSales: product.totalSales || 0,
            views: product.views || 0,
            weight: product.weight,
            // NEW: Product details
            keyFeatures: product.keyFeatures || [],
            specifications: specifications,
            requiresLicense: product.requiresLicense || false,
            licenseType: product.licenseType,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        };
    }
}
exports.ProductController = ProductController;
exports.productController = new ProductController();
//# sourceMappingURL=product.controller.js.map