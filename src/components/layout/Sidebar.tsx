import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Receipt,
  BarChart3,
  Users,
  Settings,
  LogOut,
  X,
  ShoppingCart,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, storeProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ONLY the 7 mandatory menus for Admin Panel
  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Produk', path: '/admin/produk', icon: Package },
    { name: 'Kategori', path: '/admin/kategori', icon: FolderTree },
    { name: 'Transaksi', path: '/admin/transaksi', icon: Receipt },
    { name: 'Rekap Laporan Bulanan', path: '/admin/rekap-laporan', icon: BarChart3 },
    { name: 'Kasir / User', path: '/admin/kasir-user', icon: Users },
    { name: 'Pengaturan', path: '/admin/pengaturan', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#3E2410] text-white select-none border-r border-white/10">
      {/* Brand Header */}
      <div className="h-20 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="SISISAWA Logo" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-black text-base sm:text-lg tracking-tight truncate leading-tight text-white">
              {storeProfile?.name || 'SISISAWA'}
            </h1>
            <span className="text-[11px] text-[#CBC6B2] font-extrabold tracking-wider uppercase">
              Aplikasi Kasir
            </span>
          </div>
        </div>

        {/* Close Button for Tablet Portrait / Mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label="Tutup Menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Quick POS Terminal Button (Top Action) */}
      <div className="px-3.5 pt-4 pb-2 shrink-0">
        <button
          onClick={() => {
            if (onClose) onClose();
            navigate('/pos');
          }}
          className="w-full py-3 px-4 rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white font-black text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-[#835227]/30 transition-all active:scale-98 group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <ShoppingCart size={15} />
            </div>
            <span>Buka Layar Kasir</span>
          </div>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Navigation Menus (Strictly 7 menus) */}
      <nav className="flex-1 py-2 px-3 space-y-1.5 overflow-y-auto no-scrollbar">
        <div className="px-3 pb-1 pt-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Menu Utama
          </span>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 min-h-[46px] rounded-2xl font-bold text-xs sm:text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-[#835227] text-white font-black shadow-md shadow-[#835227]/30 translate-x-1'
                    : 'text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout Button */}
      <div className="p-4 border-t border-white/10 shrink-0 space-y-3">
        <div className="px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#8B9793] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold text-white truncate leading-snug">
              {user?.name || 'Administrator'}
            </p>
            <span className="inline-block text-[10px] text-[#CBC6B2] font-black uppercase">
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs bg-rose-500/20 text-rose-200 hover:bg-rose-500 hover:text-white active:bg-rose-600 transition-all cursor-pointer"
        >
          <LogOut size={16} />
          <span>Keluar (Logout)</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Landscape (Fixed Sidebar) */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 h-screen sticky top-0 shrink-0 shadow-2xl z-20">
        {sidebarContent}
      </aside>

      {/* Tablet Portrait & Mobile Drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        {/* Drawer Content */}
        <div
          className={`fixed inset-y-0 left-0 w-72 sm:w-80 shadow-2xl transition-transform duration-300 transform ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
};

