const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const controller = require('../controllers/notification-controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.patch('/read-all', asyncHandler(controller.markAllRead));
router.patch('/:id/read', asyncHandler(controller.markRead));

module.exports = router;
