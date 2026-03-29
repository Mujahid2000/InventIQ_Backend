const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/auth.middleware');
const controller = require('../controllers/order.controller');

router.use(auth);

router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.put('/:id/status', controller.updateStatus);
router.put('/:id/cancel', controller.cancel);
router.delete('/:id', requireRole('admin'), controller.remove);

module.exports = router;
