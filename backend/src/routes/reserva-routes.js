const express = require('express');
const asyncHandler = require('../middleware/async-handler');
const controller = require('../controllers/reserva-controller');

const router = express.Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.get));
router.patch('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.cancel));

module.exports = router;
