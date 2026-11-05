'use strict';
(() => {
  let installPrompt = null;
  const button = document.getElementById('install-app');
  const status = document.getElementById('install-status');
  const links = document.querySelectorAll('[data-app-install]');
  const mode = window.matchMedia('(display-mode: standalone)');
  let installed = mode.matches || navigator.standalone === true;
  function update() {
    if (button) button.hidden = installed || !installPrompt;
    links.forEach(link => { link.hidden = installed; });
    if (installed && status) status.textContent = '예우맵을 앱 화면으로 사용 중입니다.';
  }
  async function install(event) {
    if (!installPrompt || installed) return;
    event.preventDefault();
    const prompt = installPrompt;
    installPrompt = null;
    update();
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (status) status.textContent = choice.outcome === 'accepted' ? '설치를 요청했습니다. 홈 화면이나 앱 목록에서 예우맵을 확인해 주세요.' : '설치를 취소했습니다. 브라우저 메뉴에서도 홈 화면에 추가할 수 있습니다.';
    } catch {
      if (status) status.textContent = '아래 안내에 따라 브라우저 메뉴에서 홈 화면에 추가해 주세요.';
    }
  }
  window.addEventListener('beforeinstallprompt',event => {
    if (installed) return;
    event.preventDefault();
    installPrompt = event;
    update();
  });
  window.addEventListener('appinstalled',() => { installed = true; installPrompt = null; update(); });
  mode.addEventListener?.('change',event => { installed = event.matches || navigator.standalone === true; update(); });
  if (button) button.addEventListener('click',install);
  links.forEach(link => link.addEventListener('click',install));
  update();
})();
