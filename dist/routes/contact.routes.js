"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contact_controller_1 = require("../controllers/contact.controller");
const error_1 = require("../middleware/error");
const router = (0, express_1.Router)();
router.post('/', (0, error_1.asyncHandler)(contact_controller_1.contactController.submit.bind(contact_controller_1.contactController)));
exports.default = router;
//# sourceMappingURL=contact.routes.js.map