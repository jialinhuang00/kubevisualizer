const express = require('express');
const app = express();
const PORT = 3000;

const jokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
  "Why do Java developers wear glasses? Because they can't C#!",
  "What's a programmer's favorite hangout place? Foo Bar!",
  "Why did the programmer quit his job? He didn't get arrays!",
  "What do you call a programmer from Finland? Nerdic!",
  "Why do Python programmers prefer snakes? Because they don't like Java!",
  "How do you comfort a JavaScript bug? You console it!"
];

app.get('/', (req, res) => {
  res.json({
    service: 'joke-service',
    version: 'v2',
    message: 'Hello from Node.js 20 version 2',
    timestamp: new Date().toISOString(),
    features: ['Enhanced jokes collection', 'Better performance']
  });
});

app.get('/joke', (req, res) => {
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
  res.json({
    service: 'joke-service',
    version: 'v2',
    joke: randomJoke,
    timestamp: new Date().toISOString(),
    rating: Math.floor(Math.random() * 5) + 1
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: 'v2', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Joke Service v2 running on port ${PORT}`);
});