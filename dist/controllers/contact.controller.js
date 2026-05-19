"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactController = exports.ContactController = void 0;
const ContactMessage_1 = require("../models/ContactMessage");
class ContactController {
    async submit(req, res) {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !message) {
            res.status(400).json({ success: false, message: 'name, email and message are required' });
            return;
        }
        await ContactMessage_1.ContactMessage.create({ name, email, subject, message });
        res.status(201).json({ success: true, message: 'Contact message received' });
    }
}
exports.ContactController = ContactController;
exports.contactController = new ContactController();
//# sourceMappingURL=contact.controller.js.map