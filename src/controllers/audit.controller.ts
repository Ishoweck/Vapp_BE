import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import AuditLog from '../models/AuditLog';
import { asyncHandler } from '../middleware/error';

// GET /admin/audit-logs
export const getAuditLogs = asyncHandler(async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  const {
    page = 1,
    limit = 30,
    action,
    entityType,
    adminId,
    fingerprint,
    startDate,
    endDate,
    search,
  } = req.query;

  const filter: any = {};

  if (action) filter.action = { $regex: action, $options: 'i' };
  if (entityType) filter.entityType = entityType;
  if (adminId) filter.admin = adminId;
  if (fingerprint) filter.fingerprint = fingerprint;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate as string);
    if (endDate) filter.createdAt.$lte = new Date(endDate as string);
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
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(filter),
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
export const getAuditStats = asyncHandler(async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  const { period = '7d' } = req.query;

  const periodMap: Record<string, number> = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };
  const days = periodMap[period as string] || 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    totalActions,
    actionsByType,
    actionsByAdmin,
    actionsByEntity,
    uniqueFingerprints,
    recentActions,
  ] = await Promise.all([
    AuditLog.countDocuments({ createdAt: { $gte: startDate } }),
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    AuditLog.aggregate([
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
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$entityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$fingerprint', count: { $sum: 1 }, lastSeen: { $max: '$createdAt' }, adminName: { $first: '$adminName' }, ip: { $first: '$ip' }, userAgent: { $first: '$userAgent' } } },
      { $sort: { count: -1 } },
    ]),
    AuditLog.find()
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
export const getEntityAuditTrail = asyncHandler(async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  const { entityType, entityId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const filter = { entityType, entityId };

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(filter),
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
export const getFingerprints = asyncHandler(async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const fingerprints = await AuditLog.aggregate([
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

  const totalResult = await AuditLog.aggregate([
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
export const getAuditLogDetail = asyncHandler(async (
  req: AuthRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  const log = await AuditLog.findById(req.params.id).lean();

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
