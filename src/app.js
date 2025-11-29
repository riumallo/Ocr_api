const express = require('express');

const ocrRoute = require('./routes/ocr');

const app = express();

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/ocr', ocrRoute);

module.exports = app;
