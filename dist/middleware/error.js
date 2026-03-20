"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFound = exports.errorHandler = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err.message || 'Internal server error';
    logger_1.logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            message: 'Validation error',
            error: err.message,
        });
        return;
    }
    // Mongoose duplicate key error
    if (err.name === 'MongoServerError' && err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        const fieldLabels = {
            email: 'Email address',
            phone: 'Phone number',
            sku: 'SKU',
            slug: 'Product name',
            affiliateCode: 'Affiliate code',
        };
        const label = fieldLabels[field] || field;
        res.status(400).json({
            success: false,
            message: `${label} is already registered. Please use a different ${label.toLowerCase()} or sign in to your existing account.`,
            error: `${field} already exists`,
        });
        return;
    }
    // Mongoose cast error
    if (err.name === 'CastError') {
        res.status(400).json({
            success: false,
            message: 'Invalid ID format',
            error: err.message,
        });
        return;
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            message: 'Invalid token',
            error: err.message,
        });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            message: 'Token expired',
            error: err.message,
        });
        return;
    }
    // Default error response
    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
exports.errorHandler = errorHandler;
// ← Only change: added NextFunction param so Socket.IO requests pass through
const notFound = (req, res, next) => {
    if (req.path.startsWith('/socket.io')) {
        next();
        return;
    }
    res.status(404).json({
        success: false,
        message: 'Route not found',
        error: `Cannot ${req.method} ${req.url}`,
    });
};
exports.notFound = notFound;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=error.js.map