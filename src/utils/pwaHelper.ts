export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    (window as any).deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-available', { detail: e }));
  });
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return globalDeferredPrompt || (typeof window !== 'undefined' ? (window as any).deferredPrompt : null);
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function isAppleDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  );
}

export async function triggerPWAInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const promptEvent = getDeferredPrompt();
  if (!promptEvent) return 'unavailable';

  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      globalDeferredPrompt = null;
      if (typeof window !== 'undefined') {
        (window as any).deferredPrompt = null;
      }
    }
    return choice.outcome;
  } catch (err) {
    console.error('Error triggering PWA install:', err);
    return 'unavailable';
  }
}
