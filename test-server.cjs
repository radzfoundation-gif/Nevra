// Simple CommonJS test server for Passenger
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.type('text/html').send('<h1>Test Server OK (CommonJS)</h1>');
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: 'CommonJS' });
});

const PORT = process.env.PORT || 8788;
app.listen(PORT, () => {
  console.log(`Test server listening on ${PORT}`);
});

module.exports = app;














