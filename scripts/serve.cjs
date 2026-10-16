const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../dist');
const port = Number(process.env.BENEFIT_MAP_PORT || 8093);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
http.createServer((req,res) => {
  let requested; try { requested = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const file = path.resolve(root,'.'+(requested === '/' ? '/index.html' : requested));
  if (!file.startsWith(root+path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file,(err,data) => { if(err) { res.writeHead(404).end('Not found'); return; } res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'}); res.end(data); });
}).listen(port,'127.0.0.1',() => console.log(`Local: http://localhost:${port}`));
