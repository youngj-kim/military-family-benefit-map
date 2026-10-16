'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {parseOfficial} = require('./mma-data.cjs');
if (!process.argv[2]) throw Error('Usage: node scripts/prepare-data.cjs <official JSONP file>');
const out = parseOfficial(fs.readFileSync(process.argv[2],'utf8'));
fs.writeFileSync(path.join(__dirname,'../dist/facilities.json'),JSON.stringify(out));
console.log(JSON.stringify({total:out.facilities.length,located:out.facilities.filter(r=>r.lat!==null).length,missingLocation:out.facilities.filter(r=>r.lat===null).length}));