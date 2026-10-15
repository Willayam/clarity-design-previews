// Static server for verify.mjs and record.mjs. Range requests so <video> can seek.
import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import path from 'node:path';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
export function serve(root, port = 0) {
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let file = path.join(root, decodeURIComponent(u.pathname));
    if (u.pathname.endsWith('/')) file = path.join(file, 'index.html');
    if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    const size = statSync(file).size;
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}
if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) {
  const { url } = await serve(process.argv[2] || process.cwd(), Number(process.argv[3] || 0));
  console.log(url);
}
