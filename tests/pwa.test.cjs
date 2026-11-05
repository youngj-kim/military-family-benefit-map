const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
test('all pages advertise the same standalone app and correctly sized PNG icons',()=>{
  const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));
  assert.equal(manifest.name,'예우맵');assert.equal(manifest.short_name,'예우맵');
  assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');
  assert.equal(manifest.display,'standalone');assert.equal(manifest.prefer_related_applications,false);
  for(const name of fs.readdirSync('dist').filter(name=>name.endsWith('.html'))){
    const html=fs.readFileSync(path.join('dist',name),'utf8');
    assert.match(html,/<link rel="manifest" href="manifest.webmanifest">/,name);
    assert.match(html,/<link rel="apple-touch-icon"[^>]*href="icons\/apple-touch-icon.png">/,name);
  }
  assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192'));
  assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'));
  assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
  for(const icon of [...manifest.icons,{src:'/icons/apple-touch-icon.png',sizes:'180x180'}]){
    const png=fs.readFileSync('dist'+icon.src);
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16),Number(icon.sizes.split('x')[0]));
    assert.equal(png.readUInt32BE(20),Number(icon.sizes.split('x')[1]));
  }
});
function fixture(standalone=false){
  const handlers={},nodes={};
  for(const id of ['install-app','install-status','install-link'])nodes[id]={hidden:false,handlers:{},addEventListener(type,callback){this.handlers[type]=callback;}};
  vm.runInNewContext(fs.readFileSync('dist/install.js','utf8'),{
    window:{matchMedia:()=>({matches:standalone,addEventListener(){}}),addEventListener:(type,callback)=>{handlers[type]=callback;}},
    navigator:{},document:{getElementById:id=>nodes[id],querySelectorAll:()=>[nodes['install-link']]}
  });
  return {handlers,nodes};
}
test('unsupported browsers keep manual installation instructions without intercepting links',async()=>{
  const {nodes}=fixture();let intercepted=false;
  assert.equal(nodes['install-app'].hidden,true);assert.equal(nodes['install-link'].hidden,false);
  await nodes['install-link'].handlers.click({preventDefault(){intercepted=true;}});
  assert.equal(intercepted,false);
});
test('install prompt is shown only after a user click and is consumed once',async()=>{
  const {handlers,nodes}=fixture();let prompted=0,intercepted=false;
  handlers.beforeinstallprompt({preventDefault(){},prompt:async()=>{prompted++;},userChoice:Promise.resolve({outcome:'accepted'})});
  assert.equal(nodes['install-app'].hidden,false);assert.equal(prompted,0);
  await nodes['install-app'].handlers.click({preventDefault(){intercepted=true;}});
  assert.equal(intercepted,true);assert.equal(prompted,1);assert.equal(nodes['install-app'].hidden,true);
  assert.match(nodes['install-status'].textContent,/설치를 요청/);
  handlers.appinstalled();assert.equal(nodes['install-link'].hidden,true);
});
test('standalone mode hides installation controls and identifies app mode',()=>{
  const {nodes}=fixture(true);
  assert.equal(nodes['install-app'].hidden,true);assert.equal(nodes['install-link'].hidden,true);
  assert.match(nodes['install-status'].textContent,/앱 화면/);
});
test('dismissed installation keeps a usable manual path',async()=>{
  const {handlers,nodes}=fixture();
  handlers.beforeinstallprompt({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'dismissed'})});
  await nodes['install-app'].handlers.click({preventDefault(){}});
  assert.equal(nodes['install-link'].hidden,false);assert.match(nodes['install-status'].textContent,/취소/);
});
