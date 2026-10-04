import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export const Login: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Silakan masukkan username dan password.');
      return;
    }

    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);

    if (result.success) {
      if (result.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/pos', { replace: true });
      }
    } else {
      setError(result.message || 'Login gagal. Periksa username dan password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#EFEFEF] flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[#835227]/30 relative overflow-hidden">
      {/* Soft Ambient Background Circles */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#835227]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#8B9793]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-20 h-20 rounded-3xl bg-[#3E2410] border border-[#CBC6B2]/40 items-center justify-center p-2.5 shadow-xl shadow-[#835227]/20 mb-4 overflow-hidden">
            <img src="/logo.png" alt="SISISAWA Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              SISISAWA
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#835227]/10 text-[#835227] border border-[#835227]/20">
              KASIR
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
            Aplikasi Kasir Modern & Mudah Digunakan
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 sm:p-8 shadow-xl border-[#CBC6B2]/40 rounded-3xl bg-white/95 backdrop-blur-xs">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#835227]/10 text-[#835227] text-xs font-bold mb-2">
              <Sparkles size={13} className="text-[#835227]" />
              <span>Masuk Aplikasi</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">Selamat Datang Kembali</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Gunakan akun Admin atau Kasir untuk mulai bertransaksi
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={<User size={18} />}
              required
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={18} />}
              required
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-5 rounded-2xl font-black text-sm bg-[#835227] hover:bg-[#6F441E] text-white shadow-lg shadow-[#835227]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>{loading ? 'Memverifikasi...' : 'Masuk Sekarang'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </Card>

        {/* Security Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-xs text-center font-medium">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span>Sistem Terotentikasi JWT & Terenkripsi Bcrypt</span>
        </div>
      </div>
    </div>
  );
};

