const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({
    service: 'number-service',
    version: 'v1',
    message: 'Hello from Node.js 18 version 1',
    timestamp: new Date().toISOString()
  });
});

app.get('/random', (req, res) => {
  const randomNumber = Math.floor(Math.random() * 100);
  res.json({
    service: 'number-service',
    version: 'v1',
    number: randomNumber,
    timestamp: new Date().toISOString()
  });
});

app.get('/random/:max', (req, res) => {
  const max = parseInt(req.params.max) || 100;
  const randomNumber = Math.floor(Math.random() * max);
  res.json({
    service: 'number-service',
    version: 'v1',
    number: randomNumber,
    max: max,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: 'v1' });
});

app.listen(PORT, () => {
  console.log(`Number Service v1 running on port ${PORT}`);
});