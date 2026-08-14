const installButton = document.querySelector('#installButton');
const year = document.querySelector('#year');
let deferredInstallPrompt = null;

if (year) {
  year.textContent = new Date().getFullYear();
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  if (installButton) {
    installButton.hidden = false;
  }
});

installButton?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
      console.info('iGlow Beauty service worker registered.');
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });
}
