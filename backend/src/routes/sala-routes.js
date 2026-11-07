const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const { requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/sala-controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', requireAdmin, asyncHandler(controller.create));
router.get('/:id/disponibilidade', asyncHandler(controller.availability));
router.get('/:id', asyncHandler(controller.get));
router.patch('/:id', requireAdmin, asyncHandler(controller.update));
router.delete('/:id', requireAdmin, asyncHandler(controller.remove));

module.exports = router;
