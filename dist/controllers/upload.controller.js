"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadController = exports.UploadController = void 0;
const error_1 = require("../middleware/error");
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const logger_1 = require("../utils/logger");
const VendorProfile_1 = __importDefault(require("../models/VendorProfile"));
class UploadController {
    /**
     * Upload vendor image to Cloudinary
     */
    async uploadVendorImage(req, res) {
        if (!req.file) {
            throw new error_1.AppError('No image file provided', 400);
        }
        const type = req.body.type || 'logo'; // 'logo' or 'banner'
        try {
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary_1.default.uploader.upload_stream({
                    folder: `vendor/${type}s`,
                    transformation: type === 'logo'
                        ? [{ width: 400, height: 400, crop: 'fill' }]
                        : [{ width: 1200, height: 400, crop: 'fill' }],
                }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                });
                uploadStream.end(req.file.buffer);
            });
            const cloudinaryResult = result;
            logger_1.logger.info(`Vendor ${type} uploaded: ${cloudinaryResult.secure_url}`);
            res.json({
                success: true,
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`,
                data: {
                    url: cloudinaryResult.secure_url,
                    publicId: cloudinaryResult.public_id,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Upload error:', error);
            throw new error_1.AppError('Failed to upload image', 500);
        }
    }
    /**
     * ✅ NEW METHOD - Upload KYC document to Cloudinary
     * Supports images (jpg, png) and PDFs
     */
    async uploadKYCDocument(req, res) {
        if (!req.file) {
            throw new error_1.AppError('No document file provided', 400);
        }
        const { type } = req.body; // 'CAC', 'ID_CARD', 'UTILITY_BILL', 'PASSPORT', 'DRIVERS_LICENSE'
        const validTypes = ['NIN', 'CAC', 'ID_CARD', 'UTILITY_BILL', 'PASSPORT', 'DRIVERS_LICENSE'];
        if (!type || !validTypes.includes(type)) {
            throw new error_1.AppError(`Invalid document type. Must be one of: ${validTypes.join(', ')}`, 400);
        }
        try {
            // Determine resource type based on file mimetype
            const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadOptions = {
                    folder: `kyc-documents/${req.user?.id}`,
                    resource_type: resourceType,
                };
                // For images, add optimization transformation
                if (resourceType === 'image') {
                    uploadOptions.transformation = [
                        { width: 1500, height: 1500, crop: 'limit', quality: 'auto' }
                    ];
                }
                const uploadStream = cloudinary_1.default.uploader.upload_stream(uploadOptions, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                });
                uploadStream.end(req.file.buffer);
            });
            const cloudinaryResult = result;
            logger_1.logger.info(`KYC document uploaded for user ${req.user?.id}:`, {
                type,
                url: cloudinaryResult.secure_url,
            });
            // Save document to vendor profile immediately
            const vendorProfile = await VendorProfile_1.default.findOne({ user: req.user?.id });
            if (vendorProfile) {
                // Remove any existing document of this type, then add the new one
                vendorProfile.kycDocuments = vendorProfile.kycDocuments.filter((doc) => doc.type !== type);
                vendorProfile.kycDocuments.push({
                    type,
                    documentUrl: cloudinaryResult.secure_url,
                    verificationStatus: 'pending',
                });
                await vendorProfile.save();
                logger_1.logger.info(`KYC document saved to vendor profile: ${type}`);
            }
            res.json({
                success: true,
                message: 'Document uploaded successfully',
                data: {
                    url: cloudinaryResult.secure_url,
                    publicId: cloudinaryResult.public_id,
                    type,
                    format: cloudinaryResult.format,
                    size: cloudinaryResult.bytes,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Upload KYC document error:', error);
            throw new error_1.AppError('Failed to upload document', 500);
        }
    }
}
exports.UploadController = UploadController;
exports.uploadController = new UploadController();
//# sourceMappingURL=upload.controller.js.map