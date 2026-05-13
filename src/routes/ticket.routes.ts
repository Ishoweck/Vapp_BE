import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

router.get('/stats', asyncHandler(ticketController.getStats.bind(ticketController)));
router.get('/', asyncHandler(ticketController.getTickets.bind(ticketController)));
router.get('/:ticketId', asyncHandler(ticketController.getTicket.bind(ticketController)));
router.put('/:ticketId', asyncHandler(ticketController.updateTicket.bind(ticketController)));

export default router;
