"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_chat_controller_1 = require("../controllers/ai-chat.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const router = (0, express_1.Router)();
// AI chat endpoint - requires authentication
router.post('/', auth_1.authenticate, (0, error_1.asyncHandler)(ai_chat_controller_1.aiChatController.chat.bind(ai_chat_controller_1.aiChatController)));
exports.default = router;
//# sourceMappingURL=ai-chat.routes.js.map