import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Clock, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, storeProfile } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Determine Title based on current path
  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/admin/dashboard':
        return 'Dashboard Penjualan';
      case '/admin/produk':
        return 'Kelola Produk & Menu';
      case '/admin/kategori':
        return 'Kelola Kategori';
      case '/admin/transaksi':
        return 'Riwayat Transaksi';
      case '/admin/rekap-laporan':
        return 'Rekap Laporan Bulanan';
      case '/admin/kasir-user':
        return 'Kelola Kasir & Pengguna';
      case '/admin/pengaturan':
        return 'Pengaturan Sistem';
      default:
        return 'Admin Panel';
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const timeString = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(now);

        const dateString = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Makassar',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }).format(now);

        setCurrentTime(`${timeString} WITA`);
        setCurrentDate(dateString);
      } catch (e) {
        setCurrentTime(now.toLocaleTimeString());
        setCurrentDate(now.toLocaleDateString());
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-20 bg-white/85 backdrop-blur-md border-b border-[#CBC6B2]/40 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs shrink-0">
      {/* Left: Mobile Menu Toggle & Page Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl flex items-center justify-center text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors"
          aria-label="Buka Menu"
        >
          <Menu size={22} />
        </button>

        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            {getPageTitle(location.pathname)}
          </h2>
          <p className="text-xs text-slate-400 font-medium hidden sm:block">
            {storeProfile?.name ? `${storeProfile.name} • Aplikasi Kasir` : 'SISISAWA • Aplikasi Kasir'}
          </p>
        </div>
      </div>

      {/* Right: Date/Time (Asia/Makassar), POS Quick Action & Profile Badge */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick Launch POS Button */}
        <button
          onClick={() => navigate('/pos')}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white font-black text-xs shadow-md shadow-[#835227]/20 transition-all active:scale-95 cursor-pointer"
        >
          <ShoppingCart size={15} />
          <span>Buka POS</span>
        </button>

        {/* Clock Info (Tablet & Desktop) */}
        <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-[#CBC6B2]/20 text-slate-700 border border-[#CBC6B2]/50">
          <Clock size={16} className="text-[#835227]" />
          <div className="text-right">
            <span className="text-xs font-extrabold block leading-tight text-slate-900">{currentTime}</span>
            <span className="text-[10px] text-slate-500 font-semibold block leading-tight">{currentDate}</span>
          </div>
        </div>

        {/* User Role Badge */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate max-w-[120px]">
              {user?.name || 'Admin'}
            </p>
            <span className="text-[10px] text-[#835227] font-extrabold uppercase tracking-wider block">
              {user?.role || 'ADMIN'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#835227] text-white flex items-center justify-center font-black text-sm shadow-md shadow-slate-900/10">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
        </div>
      </div>
    </header>
  );
};

