"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogDetail = exports.getFingerprints = exports.getEntityAuditTrail = exports.getAuditStats = exports.getAuditLogs = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const error_1 = require("../middleware/error");
// GET /admin/audit-logs
exports.getAuditLogs = (0, error_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 30, action, entityType, adminId, fingerprint, startDate, endDate, search, } = req.query;
    const filter = {};
    if (action)
        filter.action = { $regex: action, $options: 'i' };
    if (entityType)
        filter.entityType = entityType;
    if (adminId)
        filter.admin = adminId;
    if (fingerprint)
        filter.fingerprint = fingerprint;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate)
            filter.createdAt.$gte = new Date(startDate);
        if (endDate)
            filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
        filter.$or = [
            { action: { $regex: search, $options: 'i' } },
            { adminName: { $regex: search, $options: 'i' } },
            { adminEmail: { $regex: search, $options: 'i' } },
            { entityType: { $regex: search, $options: 'i' } },
            { path: { $regex: search, $options: 'i' } },
        ];
    }
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    const [logs, total] = await Promise.all([
        AuditLog_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        AuditLog_1.default.countDocuments(filter),
    ]);
    res.json({
        success: true,
        data: logs,
        meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
        },
    });
});
// GET /admin/audit-logs/stats
exports.getAuditStats = (0, error_1.asyncHandler)(async (req, res) => {
    const { period = '7d' } = req.query;
    const periodMap = {
        '24h': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90,
    };
    const days = periodMap[period] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const [totalActions, actionsByType, actionsByAdmin, actionsByEntity, uniqueFingerprints, recentActions,] = await Promise.all([
        AuditLog_1.default.countDocuments({ createdAt: { $gte: startDate } }),
        AuditLog_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
        ]),
        AuditLog_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$admin',
                    adminName: { $first: '$adminName' },
                    adminEmail: { $first: '$adminEmail' },
                    count: { $sum: 1 },
                    lastAction: { $max: '$createdAt' },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]),
        AuditLog_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$entityType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        AuditLog_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$fingerprint', count: { $sum: 1 }, lastSeen: { $max: '$createdAt' }, adminName: { $first: '$adminName' }, ip: { $first: '$ip' }, userAgent: { $first: '$userAgent' } } },
            { $sort: { count: -1 } },
        ]),
        AuditLog_1.default.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean(),
    ]);
    res.json({
        success: true,
        data: {
            totalActions,
            actionsByType,
            actionsByAdmin,
            actionsByEntity,
            uniqueFingerprints,
            recentActions,
        },
    });
});
// GET /admin/audit-logs/entity/:entityType/:entityId
exports.getEntityAuditTrail = (0, error_1.asyncHandler)(async (req, res) => {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    const filter = { entityType, entityId };
    const [logs, total] = await Promise.all([
        AuditLog_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        AuditLog_1.default.countDocuments(filter),
    ]);
    res.json({
        success: true,
        data: logs,
        meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
        },
    });
});
// GET /admin/audit-logs/fingerprints
exports.getFingerprints = (0, error_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    const fingerprints = await AuditLog_1.default.aggregate([
        {
            $group: {
                _id: '$fingerprint',
                totalActions: { $sum: 1 },
                lastSeen: { $max: '$createdAt' },
                firstSeen: { $min: '$createdAt' },
                adminName: { $last: '$adminName' },
                adminEmail: { $last: '$adminEmail' },
                adminRole: { $last: '$adminRole' },
                ip: { $last: '$ip' },
                userAgent: { $last: '$userAgent' },
                uniqueAdmins: { $addToSet: '$admin' },
            },
        },
        { $addFields: { uniqueAdminCount: { $size: '$uniqueAdmins' } } },
        { $project: { uniqueAdmins: 0 } },
        { $sort: { lastSeen: -1 } },
        { $skip: skip },
        { $limit: limitNum },
    ]);
    const totalResult = await AuditLog_1.default.aggregate([
        { $group: { _id: '$fingerprint' } },
        { $count: 'total' },
    ]);
    const total = totalResult[0]?.total || 0;
    res.json({
        success: true,
        data: fingerprints,
        meta: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
        },
    });
});
// GET /admin/audit-logs/:id
exports.getAuditLogDetail = (0, error_1.asyncHandler)(async (req, res) => {
    const log = await AuditLog_1.default.findById(req.params.id).lean();
    if (!log) {
        res.status(404).json({
            success: false,
            message: 'Audit log entry not found',
        });
        return;
    }
    res.json({
        success: true,
        data: log,
    });
});
//# sourceMappingURL=audit.controller.js.map