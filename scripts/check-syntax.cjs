'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
for (const dir of ['dist','scripts','tests']) {
  for (const file of fs.readdirSync(dir).filter(name => /\.(c?js)$/.test(name))) {
    const result = spawnSync(process.execPath,['--check',path.join(dir,file)],{encoding:'utf8'});
    if (result.status !== 0) { console.error(result.stderr || result.error?.message); process.exitCode = 1; }
  }
}
