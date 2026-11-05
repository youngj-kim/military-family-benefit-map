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
function fixture(standalone=false,userAgent=''){
  const handlers={},nodes={},timers=new Map();let timerId=0;
  for(const id of ['install-app','install-status','install-link','install-banner','install-main','install-main-status','install-open-chrome','install-dismiss'])nodes[id]={hidden:false,handlers:{},addEventListener(type,callback){this.handlers[type]=callback;}};
  vm.runInNewContext(fs.readFileSync('dist/install.js','utf8'),{
    window:{matchMedia:()=>({matches:standalone,addEventListener(){}}),addEventListener:(type,callback)=>{handlers[type]=callback;}},
    navigator:{userAgent},document:{getElementById:id=>nodes[id],querySelectorAll:()=>[nodes['install-link']]},
    setTimeout:callback=>{timers.set(++timerId,callback);return timerId;},clearTimeout:id=>timers.delete(id)
  });
  return {handlers,nodes,timers};
}
test('unsupported browsers keep manual installation instructions without intercepting links',async()=>{
  const {nodes}=fixture();let intercepted=false;
  assert.equal(nodes['install-app'].hidden,true);assert.equal(nodes['install-link'].hidden,false);
  await nodes['install-link'].handlers.click({preventDefault(){intercepted=true;}});
  assert.equal(intercepted,false);
});
test('Galaxy main screen offers a large button and unlocks when the browser permits installation',async()=>{
  const {handlers,nodes,timers}=fixture(false,'Mozilla/5.0 (Linux; Android 15) Chrome/140.0');let prompts=0;
  assert.equal(nodes['install-banner'].hidden,false);assert.equal(nodes['install-main'].hidden,false);
  await nodes['install-main'].handlers.click({preventDefault(){}});
  assert.equal(nodes['install-main'].disabled,true);assert.equal(timers.size,1);
  handlers.beforeinstallprompt({preventDefault(){},prompt:async()=>{prompts++;},userChoice:Promise.resolve({outcome:'accepted'})});
  assert.equal(nodes['install-main'].disabled,false);assert.equal(timers.size,0);assert.equal(prompts,0);
  await nodes['install-main'].handlers.click({preventDefault(){}});assert.equal(prompts,1);
  handlers.appinstalled();assert.equal(nodes['install-banner'].hidden,true);
});
test('embedded Galaxy browsers offer a user-activated Chrome link instead of a fake install',()=>{
  const {nodes}=fixture(false,'Mozilla/5.0 (Linux; Android 15; wv) Chrome/140.0 KAKAOTALK');
  assert.equal(nodes['install-main'].hidden,true);assert.equal(nodes['install-open-chrome'].hidden,false);
  assert.match(nodes['install-open-chrome'].href,/^intent:\/\/yeumap\.yjkim\.dev\//);
  assert.match(nodes['install-open-chrome'].href,/package=com.android.chrome/);
});
test('waiting has a bounded fallback and a dismissed banner stays dismissed',async()=>{
  const {handlers,nodes,timers}=fixture(false,'Android Chrome');
  await nodes['install-main'].handlers.click({preventDefault(){}});[...timers.values()][0]();
  assert.equal(nodes['install-main'].disabled,false);assert.match(nodes['install-main-status'].textContent,/아직/);
  nodes['install-dismiss'].handlers.click();assert.equal(nodes['install-banner'].hidden,true);
  handlers.beforeinstallprompt({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'dismissed'})});
  assert.equal(nodes['install-banner'].hidden,true);
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
