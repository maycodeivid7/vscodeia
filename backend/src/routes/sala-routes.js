const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const controller = require('../controllers/sala-controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:id/disponibilidade', asyncHandler(controller.availability));
router.get('/:id', asyncHandler(controller.get));
router.patch('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
