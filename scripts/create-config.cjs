'use strict';
const fs = require('node:fs');
const path = require('node:path');
function createConfig(key) {
  const value = String(key || '').trim();
  if (!/^[a-f0-9]{32}$/i.test(value)) {
    throw new Error('KAKAO_JAVASCRIPT_KEY must be a 32-character JavaScript key.');
  }
  return 'window.BENEFIT_MAP_CONFIG = ' + JSON.stringify({kakaoJavascriptKey:value}) + ';\n';
}
if (require.main === module) {
  try {
    const content = createConfig(process.env.KAKAO_JAVASCRIPT_KEY);
    fs.writeFileSync(path.join(__dirname,'../dist/config.js'),content);
    console.log('Map configuration generated.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = {createConfig};