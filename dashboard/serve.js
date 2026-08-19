const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const types = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  try {
    urlPath = decodeURI(urlPath);
  } catch (e) {
    // keep raw
  }
  if (urlPath === '/' || urlPath === '') urlPath = '/关系图.html';

  const filePath = path.join(root, urlPath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found: ' + urlPath);
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain; charset=utf-8' });
    res.end(data);
  });
});

server.listen(8766, () => {
  console.log('关系图服务已启动: http://localhost:8766/关系图.html');
});
