'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.join(__dirname,'../dist');
for (const name of fs.readdirSync(root).filter(name => name.endsWith('.html'))) {
const file = path.join(root,name);
const html = fs.readFileSync(file,'utf8').replace(/\b(src|href)="([^"?:]+\.(?:js|css))(?:\?[^"\s]*)?"/g,(_match,attribute,asset) => {
  const hash = createHash('sha256').update(fs.readFileSync(path.join(root,asset))).digest('hex').slice(0,12);
  return `${attribute}="${asset}?v=${hash}"`;
});
fs.writeFileSync(file,html);
}
