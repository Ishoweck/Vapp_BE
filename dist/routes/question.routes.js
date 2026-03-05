"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/question.routes.ts
const express_1 = require("express");
const question_controller_1 = require("../controllers/question.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
const askQuestionValidation = [
    (0, express_validator_1.body)('productId').notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('question')
        .notEmpty()
        .withMessage('Question is required')
        .isLength({ max: 1000 })
        .withMessage('Question cannot exceed 1000 characters'),
];
const answerQuestionValidation = [
    (0, express_validator_1.body)('answer')
        .notEmpty()
        .withMessage('Answer is required')
        .isLength({ max: 2000 })
        .withMessage('Answer cannot exceed 2000 characters'),
];
// Public routes
router.get('/product/:productId', (0, error_1.asyncHandler)(question_controller_1.questionController.getProductQuestions.bind(question_controller_1.questionController)));
// Authenticated routes
router.use(auth_1.authenticate);
router.post('/', (0, validation_1.validate)(askQuestionValidation), (0, error_1.asyncHandler)(question_controller_1.questionController.askQuestion.bind(question_controller_1.questionController)));
router.get('/my-questions', (0, error_1.asyncHandler)(question_controller_1.questionController.getMyQuestions.bind(question_controller_1.questionController)));
router.get('/vendor-questions', (0, error_1.asyncHandler)(question_controller_1.questionController.getVendorQuestions.bind(question_controller_1.questionController)));
router.put('/:questionId', (0, express_validator_1.body)('question').notEmpty().withMessage('Question is required'), (0, error_1.asyncHandler)(question_controller_1.questionController.updateQuestion.bind(question_controller_1.questionController)));
router.delete('/:questionId', (0, error_1.asyncHandler)(question_controller_1.questionController.deleteQuestion.bind(question_controller_1.questionController)));
router.put('/:questionId/answer', (0, validation_1.validate)(answerQuestionValidation), (0, error_1.asyncHandler)(question_controller_1.questionController.answerQuestion.bind(question_controller_1.questionController)));
router.post('/:questionId/helpful', (0, error_1.asyncHandler)(question_controller_1.questionController.markHelpful.bind(question_controller_1.questionController)));
router.post('/:questionId/report', (0, express_validator_1.body)('reason').notEmpty().withMessage('Report reason is required'), (0, error_1.asyncHandler)(question_controller_1.questionController.reportQuestion.bind(question_controller_1.questionController)));
exports.default = router;
//# sourceMappingURL=question.routes.js.map