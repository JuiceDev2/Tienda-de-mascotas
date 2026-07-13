'use client';

// ============================================================================
// PWA REGISTER
// Registers the custom service worker (public/sw.js) app-wide so the
// manifest + worker combo satisfies installability on every route, and
// offers a small custom "Install app" affordance since Chrome/Edge no
// longer show their own install banner unless the app calls
// prompt() on the captured beforeinstallprompt event.
// ============================================================================

import { useEffect, useState } from 'react';

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service worker registered', registration.scope);

        // If a new service worker takes over (fresh deploy), reload once so
        // the user always runs the latest cached assets/logic.
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service worker registration failed', error);
      });
  }, []);

  useEffect(() => {
    const handler = (event: any) => {
      event.preventDefault();
      setInstallPrompt(event);
      setShowInstallButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari never fires beforeinstallprompt — show a manual hint
    // instead, once per device, and only if not already installed.
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    const dismissed = localStorage.getItem('pwa-ios-hint-dismissed');
    if (isIos && !isStandalone && !dismissed) {
      setShowIosHint(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setShowInstallButton(false);
  };

  const dismissIosHint = () => {
    localStorage.setItem('pwa-ios-hint-dismissed', '1');
    setShowIosHint(false);
  };

  if (!showInstallButton && !showIosHint) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:left-auto sm:w-80 z-[60]">
      {showInstallButton && (
        <div className="bg-gray-900 text-white rounded-xl shadow-lg p-4 flex items-center gap-3">
          <div className="flex-1 text-sm">
            <p className="font-semibold">Instalar AquaPets</p>
            <p className="text-gray-300 text-xs mt-0.5">Accede más rápido, incluso sin conexión.</p>
          </div>
          <button
            onClick={handleInstall}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg shrink-0"
          >
            Instalar
          </button>
          <button
            onClick={() => setShowInstallButton(false)}
            className="text-gray-400 hover:text-white text-lg leading-none shrink-0"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      {!showInstallButton && showIosHint && (
        <div className="bg-gray-900 text-white rounded-xl shadow-lg p-4 flex items-center gap-3">
          <div className="flex-1 text-xs">
            <p className="font-semibold text-sm">Instala esta app</p>
            <p className="text-gray-300 mt-0.5">
              Toca el ícono Compartir de Safari y elige "Agregar a pantalla de inicio".
            </p>
          </div>
          <button
            onClick={dismissIosHint}
            className="text-gray-400 hover:text-white text-lg leading-none shrink-0"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
