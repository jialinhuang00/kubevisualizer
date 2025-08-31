const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

let requestCount = 0;

app.use((req, res, next) => {
  requestCount++;
  next();
});

app.get('/', (req, res) => {
  res.json({
    service: 'number-service',
    version: 'v3',
    message: 'Hello from Node.js 22 version 3',
    timestamp: new Date().toISOString(),
    features: ['Advanced algorithms', 'Request tracking', 'Multiple distributions']
  });
});

app.get('/random', (req, res) => {
  const randomNumber = Math.floor(Math.random() * 100);
  res.json({
    service: 'number-service',
    version: 'v3',
    number: randomNumber,
    timestamp: new Date().toISOString(),
    type: 'integer',
    requestId: requestCount
  });
});

app.get('/random/:max', (req, res) => {
  const max = parseInt(req.params.max) || 100;
  const randomNumber = Math.floor(Math.random() * max);
  res.json({
    service: 'number-service',
    version: 'v3',
    number: randomNumber,
    max: max,
    timestamp: new Date().toISOString(),
    type: 'integer',
    requestId: requestCount
  });
});

app.get('/random/float/:precision?', (req, res) => {
  const precision = parseInt(req.params.precision) || 2;
  const randomFloat = parseFloat((Math.random() * 100).toFixed(precision));
  res.json({
    service: 'number-service',
    version: 'v3',
    number: randomFloat,
    precision: precision,
    timestamp: new Date().toISOString(),
    type: 'float',
    requestId: requestCount
  });
});

app.get('/fibonacci/:n', (req, res) => {
  const n = parseInt(req.params.n) || 10;
  const fib = (num) => num <= 1 ? num : fib(num - 1) + fib(num - 2);
  res.json({
    service: 'number-service',
    version: 'v3',
    fibonacci: fib(Math.min(n, 30)),
    input: n,
    timestamp: new Date().toISOString(),
    requestId: requestCount
  });
});

app.get('/stats', (req, res) => {
  res.json({
    service: 'number-service',
    version: 'v3',
    totalRequests: requestCount,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: 'v3', 
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    requests: requestCount
  });
});

app.listen(PORT, () => {
  console.log(`Number Service v3 running on port ${PORT}`);
});