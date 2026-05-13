"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketService = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Additional_1 = require("../models/Additional");
const logger_1 = require("../utils/logger");
const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY });
const CATEGORIES = [
    'Delivery Issue',
    'Payment Issue',
    'Account Issue',
    'Product Issue',
    'Order Issue',
    'Technical Issue',
    'General Inquiry',
    'Other',
];
async function generateTicketId() {
    const count = await Ticket_1.default.countDocuments();
    return `TK-${String(count + 1).padStart(4, '0')}`;
}
async function summarizeConversation(conversationId, startedAt, endedAt) {
    const messages = await Additional_1.ChatMessage.find({
        conversationId,
        deleted: { $ne: true },
        messageType: { $ne: 'system' },
        createdAt: { $gte: startedAt, $lte: endedAt },
    })
        .populate('sender', 'firstName lastName role')
        .sort({ createdAt: 1 })
        .limit(80);
    if (messages.length === 0) {
        return { summary: 'No conversation messages found.', category: 'General Inquiry', priority: 'low' };
    }
    const transcript = messages
        .map((m) => {
        const sender = m.sender;
        const isAdmin = ['admin', 'super_admin', 'financial_admin'].includes(sender?.role);
        const name = isAdmin ? 'Support Agent' : `${sender?.firstName || 'User'}`;
        return `${name}: ${m.message}`;
    })
        .join('\n');
    const prompt = `You are a support ticket analyzer for VendorSpot, a Nigerian e-commerce platform.

Given the following customer support conversation transcript, respond ONLY with valid JSON (no markdown, no explanation):

{
  "summary": "2-3 sentence summary of the issue and outcome",
  "category": "one of: ${CATEGORIES.join(', ')}",
  "priority": "low | medium | high | urgent"
}

Priority guide: low = general question, medium = standard issue, high = financial or order problem, urgent = account locked or fraud.

Conversation:
${transcript}`;
    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
            temperature: 0.3,
        });
        const raw = completion.choices[0]?.message?.content?.trim() || '';
        const parsed = JSON.parse(raw);
        return {
            summary: parsed.summary || 'Could not generate summary.',
            category: CATEGORIES.includes(parsed.category) ? parsed.category : 'General Inquiry',
            priority: ['low', 'medium', 'high', 'urgent'].includes(parsed.priority)
                ? parsed.priority
                : 'medium',
        };
    }
    catch (err) {
        logger_1.logger.error('Groq ticket summarization failed:', err.message);
        return { summary: 'AI summarization unavailable.', category: 'General Inquiry', priority: 'medium' };
    }
}
exports.ticketService = {
    async createFromSession(params) {
        const { summary, category, priority } = await summarizeConversation(params.conversationId, params.startedAt, params.endedAt);
        const ticketId = await generateTicketId();
        const ticket = await Ticket_1.default.create({
            ticketId,
            userId: params.userId,
            adminId: params.adminId,
            sessionId: params.sessionId,
            conversationId: params.conversationId,
            summary,
            category,
            priority,
            status: 'open',
        });
        return ticket;
    },
    async getTickets(filters) {
        const { search, status, priority, page, limit } = filters;
        const skip = (page - 1) * limit;
        const query = {};
        if (status)
            query.status = status;
        if (priority)
            query.priority = priority;
        if (search) {
            query.$or = [
                { ticketId: { $regex: search, $options: 'i' } },
            ];
        }
        const [tickets, total] = await Promise.all([
            Ticket_1.default.find(query)
                .populate('userId', 'firstName lastName email avatar')
                .populate('adminId', 'firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Ticket_1.default.countDocuments(query),
        ]);
        return { tickets, total, page, totalPages: Math.ceil(total / limit) };
    },
    async getTicket(ticketId) {
        return Ticket_1.default.findOne({ ticketId })
            .populate('userId', 'firstName lastName email avatar')
            .populate('adminId', 'firstName lastName')
            .populate('resolvedBy', 'firstName lastName');
    },
    async updateTicket(ticketId, updates) {
        const set = {};
        if (updates.status)
            set.status = updates.status;
        if (updates.priority)
            set.priority = updates.priority;
        if (updates.notes !== undefined)
            set.notes = updates.notes;
        if (updates.status === 'resolved' || updates.status === 'closed') {
            set.resolvedAt = new Date();
            if (updates.resolvedBy)
                set.resolvedBy = updates.resolvedBy;
        }
        return Ticket_1.default.findOneAndUpdate({ ticketId }, { $set: set }, { new: true })
            .populate('userId', 'firstName lastName email avatar')
            .populate('adminId', 'firstName lastName')
            .populate('resolvedBy', 'firstName lastName');
    },
    async getStats() {
        const [open, in_progress, resolved, closed, urgent] = await Promise.all([
            Ticket_1.default.countDocuments({ status: 'open' }),
            Ticket_1.default.countDocuments({ status: 'in_progress' }),
            Ticket_1.default.countDocuments({ status: 'resolved' }),
            Ticket_1.default.countDocuments({ status: 'closed' }),
            Ticket_1.default.countDocuments({ priority: 'urgent', status: { $in: ['open', 'in_progress'] } }),
        ]);
        return { open, in_progress, resolved, closed, urgent };
    },
};
//# sourceMappingURL=ticket.service.js.map