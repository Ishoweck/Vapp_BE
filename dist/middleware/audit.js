"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = void 0;
const crypto_1 = __importDefault(require("crypto"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const User_1 = __importDefault(require("../models/User"));
function generateFingerprint(req) {
    const components = [
        req.ip || req.socket?.remoteAddress || 'unknown',
        req.headers['user-agent'] || '',
        req.headers['accept-language'] || '',
        req.headers['accept-encoding'] || '',
    ];
    return crypto_1.default.createHash('sha256').update(components.join('|')).digest('hex').substring(0, 16);
}
function parseAction(method, path) {
    const parts = path.replace(/^\/api\/v\d+\/admin\/?/, '').split('/').filter(Boolean);
    const methodMap = {
        GET: 'viewed',
        POST: 'created',
        PUT: 'updated',
        PATCH: 'updated',
        DELETE: 'deleted',
    };
    const actionVerb = methodMap[method] || method.toLowerCase();
    if (parts.length === 0)
        return { action: `${actionVerb}_dashboard`, entityType: 'dashboard' };
    let entityType = parts[0];
    let entityId;
    let action = actionVerb;
    // Handle nested routes like /vendors/:id/verify, /orders/:id/refund, etc.
    if (parts.length >= 2 && /^[a-f0-9]{24}$/.test(parts[1])) {
        entityId = parts[1];
        if (parts.length >= 3) {
            action = `${parts[2].replace(/-/g, '_')}`;
        }
    }
    else if (parts.length >= 2) {
        // Handle routes like /admins/create, /notifications/broadcast
        action = `${parts[1].replace(/-/g, '_')}`;
        if (parts.length >= 3 && /^[a-f0-9]{24}$/.test(parts[2])) {
            entityId = parts[2];
        }
    }
    // Clean up entity type
    entityType = entityType.replace(/-/g, '_');
    return { action: `${action}_${entityType}`, entityType, entityId };
}
const auditMiddleware = async (req, res, next) => {
    // Only audit mutating operations (POST, PUT, PATCH, DELETE)
    // and specific GET endpoints that are sensitive
    if (req.method === 'GET') {
        return next();
    }
    const startTime = Date.now();
    const originalJson = res.json.bind(res);
    // Override res.json to capture the response
    res.json = function (body) {
        const duration = Date.now() - startTime;
        // Don't await - fire and forget to not slow down the response
        if (req.user) {
            const { action, entityType, entityId } = parseAction(req.method, req.path);
            const logEntry = {
                action,
                entityType,
                entityId,
                admin: req.user.id,
                adminName: '', // Will be filled
                adminEmail: req.user.email,
                adminRole: req.user.role,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                ip: req.ip || req.socket?.remoteAddress || 'unknown',
                userAgent: req.headers['user-agent'] || '',
                fingerprint: generateFingerprint(req),
                changes: req.method !== 'GET' ? {
                    after: body?.data ? (typeof body.data === 'object' ? { id: body.data._id || body.data.id } : undefined) : undefined,
                    fields: req.body ? Object.keys(req.body) : [],
                } : undefined,
                metadata: {
                    requestBody: sanitizeBody(req.body),
                    query: req.query,
                },
                duration,
            };
            // Get admin name async
            User_1.default.findById(req.user.id)
                .select('firstName lastName')
                .lean()
                .then((admin) => {
                if (admin) {
                    logEntry.adminName = `${admin.firstName} ${admin.lastName}`;
                }
                else {
                    logEntry.adminName = req.user?.email || 'Unknown';
                }
                return AuditLog_1.default.create(logEntry);
            })
                .catch((err) => {
                console.error('Audit log error:', err.message);
            });
        }
        return originalJson(body);
    };
    next();
};
exports.auditMiddleware = auditMiddleware;
function sanitizeBody(body) {
    if (!body || typeof body !== 'object')
        return body;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'accessToken', 'refreshToken', 'otp'];
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    return sanitized;
}
//# sourceMappingURL=audit.js.map