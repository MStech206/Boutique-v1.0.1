const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

const PORT = 3000;

server.listen(PORT, 'localhost', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Process PID: ${process.pid}`);
  console.log('Press Ctrl+C to stop');
});

// Keep process alive
setTimeout(() => {}, 999999999);
