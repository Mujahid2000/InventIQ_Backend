const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/category.controller');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/auth.middleware');

router.use(auth);

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', requireRole('admin'), remove);

module.exports = router;
