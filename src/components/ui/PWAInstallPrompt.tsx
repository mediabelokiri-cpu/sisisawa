import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if already running in standalone / installed PWA mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Check if user dismissed prompt recently (in current session)
    const dismissed = sessionStorage.getItem('sisisawa_install_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // 3. Detect iOS / iPadOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    setIsIOS(isAppleDevice);

    // 4. Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay for smooth page entrance
      setTimeout(() => setShowPrompt(true), 1200);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not standalone, show iOS install guide after a short delay
    if (isAppleDevice && !isStandaloneMode) {
      setTimeout(() => setShowPrompt(true), 1500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User installed the PWA');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('sisisawa_install_dismissed', 'true');
    setShowPrompt(false);
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-[#3E2410] text-white rounded-3xl p-5 shadow-2xl border border-[#CBC6B2]/40 relative overflow-hidden backdrop-blur-md">
        {/* Soft background ambient glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#835227]/40 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-[#CBC6B2]/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Tutup"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3.5">
          {/* App Logo */}
          <div className="w-12 h-12 rounded-2xl bg-[#835227] border border-[#CBC6B2]/30 p-1 shrink-0 flex items-center justify-center shadow-md overflow-hidden">
            <img src="/app-icon.png" alt="SISISAWA" className="w-full h-full object-cover rounded-xl" />
          </div>

          <div className="flex-1 pr-4">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#CBC6B2]/20 text-[#CBC6B2] text-[10px] font-black uppercase tracking-wider mb-1">
              <Sparkles size={11} />
              <span>Rekomendasi Install</span>
            </div>
            <h4 className="text-sm font-extrabold text-white leading-tight">
              Install SISISAWA Kasir
            </h4>
            <p className="text-xs text-[#CBC6B2] mt-0.5 leading-snug">
              Buka aplikasi lebih cepat langsung dari layar utama Tablet atau HP Anda tanpa membuka browser.
            </p>
          </div>
        </div>

        {/* Action / Guide Section */}
        {isIOS ? (
          /* iOS / iPad Safari Guide */
          <div className="mt-4 pt-3.5 border-t border-white/10 space-y-2 text-xs">
            <p className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={14} className="text-[#CBC6B2]" />
              <span>Cara Pasang di iPad / iOS Safari:</span>
            </p>
            <div className="bg-black/30 rounded-2xl p-3 space-y-1.5 text-[11px] text-[#CBC6B2] border border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#835227] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span>
                  Ketuk tombol <strong className="text-white inline-flex items-center gap-1"><Share size={12} /> Bagikan (Share)</strong> di Safari.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#835227] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span>
                  Pilih <strong className="text-white inline-flex items-center gap-1"><PlusSquare size={12} /> Tambah ke Layar Utama</strong>.
                </span>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
              >
                Mengerti
              </button>
            </div>
          </div>
        ) : (
          /* Android / Chrome Native 1-Tap Install */
          <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between gap-2.5">
            <button
              onClick={handleDismiss}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#CBC6B2] hover:text-white transition-colors"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleInstallClick}
              className="px-5 py-2 rounded-xl bg-[#835227] hover:bg-[#6F441E] text-white font-extrabold text-xs shadow-lg shadow-[#835227]/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Download size={15} />
              <span>Install Aplikasi</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
