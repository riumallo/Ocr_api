const express = require('express');
const { procesarOCR } = require('../services/ocrService');

const router = express.Router();

router.post('/', procesarOCR);

module.exports = router;
