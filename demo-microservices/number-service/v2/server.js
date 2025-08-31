const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({
    service: 'number-service',
    version: 'v2',
    message: 'Hello from Node.js 20 version 2',
    timestamp: new Date().toISOString(),
    features: ['Range support', 'Statistics tracking']
  });
});

app.get('/random', (req, res) => {
  const randomNumber = Math.floor(Math.random() * 100);
  res.json({
    service: 'number-service',
    version: 'v2',
    number: randomNumber,
    timestamp: new Date().toISOString(),
    type: 'integer'
  });
});

app.get('/random/:max', (req, res) => {
  const max = parseInt(req.params.max) || 100;
  const randomNumber = Math.floor(Math.random() * max);
  res.json({
    service: 'number-service',
    version: 'v2',
    number: randomNumber,
    max: max,
    timestamp: new Date().toISOString(),
    type: 'integer'
  });
});

app.get('/random/float/:precision?', (req, res) => {
  const precision = parseInt(req.params.precision) || 2;
  const randomFloat = parseFloat((Math.random() * 100).toFixed(precision));
  res.json({
    service: 'number-service',
    version: 'v2',
    number: randomFloat,
    precision: precision,
    timestamp: new Date().toISOString(),
    type: 'float'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: 'v2', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Number Service v2 running on port ${PORT}`);
});