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
  "How do you comfort a JavaScript bug? You console it!",
  "Why did the developer go broke? Because he used up all his cache!",
  "What's the object-oriented way to become wealthy? Inheritance!"
];

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    service: 'joke-service',
    version: 'v3',
    message: 'Hello from Node.js 22 version 3',
    timestamp: new Date().toISOString(),
    features: ['Premium jokes', 'REST API', 'Advanced analytics']
  });
});

app.get('/joke', (req, res) => {
  const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
  res.json({
    service: 'joke-service',
    version: 'v3',
    joke: randomJoke,
    timestamp: new Date().toISOString(),
    rating: Math.floor(Math.random() * 5) + 1,
    category: 'programming'
  });
});

app.get('/jokes/random/:count?', (req, res) => {
  const count = parseInt(req.params.count) || 1;
  const randomJokes = [];
  for (let i = 0; i < Math.min(count, jokes.length); i++) {
    randomJokes.push(jokes[Math.floor(Math.random() * jokes.length)]);
  }
  res.json({
    service: 'joke-service',
    version: 'v3',
    jokes: randomJokes,
    count: randomJokes.length
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: 'v3', 
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.listen(PORT, () => {
  console.log(`Joke Service v3 running on port ${PORT}`);
});