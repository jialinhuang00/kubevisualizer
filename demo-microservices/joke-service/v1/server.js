const express = require('express');
const app = express();
const PORT = 3000;

const jokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
  "Why do Java developers wear glasses? Because they can't C#!",
  "What's a programmer's favorite hangout place? Foo Bar!",
  "Why did the programmer quit his job? He didn't get arrays!"
];

app.get('/', (req, res) => {
  res.json({
    service: 'joke-service',
    version: 'v1',
    message: 'Hello from Node.js 18 version 1',
    timestamp: new Date().toISOString()
  });
});

app.get('/joke', (req, res) => {
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
  res.json({
    service: 'joke-service',
    version: 'v1',
    joke: randomJoke,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: 'v1' });
});

app.listen(PORT, () => {
  console.log(`Joke Service v1 running on port ${PORT}`);
});