"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const types_1 = require("../types");
const audit_controller_1 = require("../controllers/audit.controller");
const router = (0, express_1.Router)();
// All routes require admin auth
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN));
router.get('/', audit_controller_1.getAuditLogs);
router.get('/stats', audit_controller_1.getAuditStats);
router.get('/fingerprints', audit_controller_1.getFingerprints);
router.get('/entity/:entityType/:entityId', audit_controller_1.getEntityAuditTrail);
router.get('/:id', audit_controller_1.getAuditLogDetail);
exports.default = router;
//# sourceMappingURL=audit.routes.js.map