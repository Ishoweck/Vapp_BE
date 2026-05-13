"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ticket_controller_1 = require("../controllers/ticket.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN));
router.get('/stats', (0, error_1.asyncHandler)(ticket_controller_1.ticketController.getStats.bind(ticket_controller_1.ticketController)));
router.get('/', (0, error_1.asyncHandler)(ticket_controller_1.ticketController.getTickets.bind(ticket_controller_1.ticketController)));
router.get('/:ticketId', (0, error_1.asyncHandler)(ticket_controller_1.ticketController.getTicket.bind(ticket_controller_1.ticketController)));
router.put('/:ticketId', (0, error_1.asyncHandler)(ticket_controller_1.ticketController.updateTicket.bind(ticket_controller_1.ticketController)));
exports.default = router;
//# sourceMappingURL=ticket.routes.js.map