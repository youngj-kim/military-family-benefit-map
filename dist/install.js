'use strict';
(() => {
  let installPrompt = null;
  const button = document.getElementById('install-app');
  const status = document.getElementById('install-status');
  const banner = document.getElementById('install-banner');
  const mainButton = document.getElementById('install-main');
  const mainStatus = document.getElementById('install-main-status');
  const chromeLink = document.getElementById('install-open-chrome');
  const dismiss = document.getElementById('install-dismiss');
  const ua = navigator.userAgent || '';
  const android = /Android/i.test(ua);
  const mobileWhale = android && /Whale\//i.test(ua);
  const embedded = android && /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|;\s*wv\b/i.test(ua);
  const useChromeFallback = mobileWhale || embedded;
  let dismissed = false, waiting = false, prompting = false, waitTimer;
  const links = document.querySelectorAll('[data-app-install]');
  const mode = window.matchMedia('(display-mode: standalone)');
  let installed = mode.matches || navigator.standalone === true;
  function message(text) { [status,mainStatus].filter(Boolean).forEach(node => { node.textContent = text; }); }
  if (chromeLink) {
    const fallback = encodeURIComponent('https://yeumap.yjkim.dev/install.html');
    chromeLink.href = 'intent://yeumap.yjkim.dev/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+fallback+';end';
    if (mobileWhale) chromeLink.textContent = 'Chrome에서 열어 설치';
  }
  function update() {
    if (button) button.hidden = installed || !installPrompt;
    if (banner) banner.hidden = installed || dismissed || (!android && !installPrompt);
    if (mainButton) {
      mainButton.hidden = useChromeFallback && !installPrompt;
      mainButton.disabled = waiting || prompting;
      mainButton.textContent = waiting ? '설치 준비 중…' : prompting ? '설치 확인 중…' : '예우지도 설치';
    }
    if (chromeLink) chromeLink.hidden = !useChromeFallback || !!installPrompt || installed;
    links.forEach(link => { link.hidden = installed; });
    if (installed) message(mode.matches || navigator.standalone === true ? '예우지도를 앱 화면으로 사용 중입니다.' : '설치되었습니다. 홈 화면의 예우지도 아이콘을 눌러 주세요.');
  }
  async function mainInstall(event) {
    if (installPrompt) return install(event);
    if (installed || waiting || prompting) return;
    waiting = true;
    message('설치를 준비하고 있어요. 잠시 뒤 버튼이 켜지면 눌러 주세요.');
    update();
    waitTimer = setTimeout(() => {
      waiting = false;
      message('아직 설치 창을 열 수 없습니다. Chrome에서 접속했는지 확인해 주세요. 이미 설치했다면 홈 화면의 예우지도를 눌러 주세요.');
      update();
    },45000);
  }
  async function install(event) {
    if (!installPrompt || installed) return;
    event.preventDefault();
    const prompt = installPrompt;
    installPrompt = null;
    prompting = true;
    update();
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      message(choice.outcome === 'accepted' ? '설치를 요청했습니다. 홈 화면에서 예우지도 아이콘을 확인해 주세요.' : '설치를 취소했습니다. 원하실 때 다시 설치할 수 있습니다.');
    } catch {
      message('설치 창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      prompting = false;
      update();
    }
  }
  window.addEventListener('beforeinstallprompt',event => {
    if (installed) return;
    event.preventDefault();
    installPrompt = event;
    waiting = false;
    clearTimeout(waitTimer);
    message('‘예우지도 설치’를 누른 뒤, 확인 창에서 ‘설치’를 눌러 주세요.');
    update();
  });
  window.addEventListener('appinstalled',() => { installed = true; installPrompt = null; waiting = false; clearTimeout(waitTimer); update(); });
  mode.addEventListener?.('change',event => { installed = event.matches || navigator.standalone === true; update(); });
  if (button) button.addEventListener('click',install);
  if (mainButton) mainButton.addEventListener('click',mainInstall);
  if (dismiss) dismiss.addEventListener('click',() => { dismissed = true; update(); });
  links.forEach(link => link.addEventListener('click',install));
  update();
  if (mobileWhale && !installed) message('모바일 웨일에서 설치 창이 열리지 않으면 Chrome에서 한 번 설치해 주세요. 평소 사용하는 브라우저는 바꾸지 않아도 됩니다.');
  else if (embedded && !installed) message('카카오톡 등의 앱 안에서는 설치가 제한될 수 있어요. 아래 버튼으로 Chrome에서 열어 주세요.');
})();
