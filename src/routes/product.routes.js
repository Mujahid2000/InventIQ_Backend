const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/auth.middleware');
const controller = require('../controllers/product.controller');

router.use(auth);

router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', requireRole('admin'), controller.remove);

module.exports = router;
