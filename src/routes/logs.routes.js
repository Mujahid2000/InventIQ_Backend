const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const ctrl = require('../controllers/logs.controller');

router.use(auth);

router.get('/', ctrl.getLatest);

module.exports = router;
