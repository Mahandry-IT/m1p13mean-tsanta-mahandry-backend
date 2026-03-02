const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminDashboard.controller');

// Endpoint unique pour le dashboard admin
router.get('/', controller.getDashboard);

module.exports = router;
