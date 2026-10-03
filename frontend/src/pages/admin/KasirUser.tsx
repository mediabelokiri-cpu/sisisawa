import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  KeyRound,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Receipt
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { UserRole, UserStatus } from '../../types';

interface ManagedUser {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  transactionCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export const KasirUser: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'KASIR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');

  // Form Modal (Add / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'KASIR' as UserRole,
    status: 'Active' as UserStatus
  });
  const [formError, setFormError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Reset Password Modal
  const [resettingUser, setResettingUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [resetError, setResetError] = useState<string>('');
  const [resetting, setResetting] = useState<boolean>(false);

  // Status Toggle Confirmation
  const [togglingUser, setTogglingUser] = useState<ManagedUser | null>(null);
  const [toggling, setToggling] = useState<boolean>(false);

  // Delete Confirmation
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/users?search=${encodeURIComponent(searchQuery)}`;
      if (roleFilter !== 'ALL') {
        url += `&role=${roleFilter}`;
      }
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }

      const res = await api.get(url);
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err: any) {
      console.error('Fetch users error:', err);
      setError('Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, roleFilter, statusFilter]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'KASIR',
      status: 'Active'
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (u: ManagedUser) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      username: u.username,
      password: '',
      role: u.role,
      status: u.status
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenResetPassword = (u: ManagedUser) => {
    setResettingUser(u);
    setNewPassword('');
    setResetError('');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }
    if (!formData.username.trim()) {
      setFormError('Username wajib diisi.');
      return;
    }
    if (!editingUser && (!formData.password || formData.password.length < 4)) {
      setFormError('Password awal minimal 4 karakter.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      if (editingUser) {
        const res = await api.put(`/users/${editingUser.id}`, {
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          role: formData.role,
          status: formData.status
        });
        if (res.data.success) {
          showNotification(`Data pengguna "${formData.name}" berhasil diperbarui.`);
          setIsFormModalOpen(false);
          fetchUsers();
        }
      } else {
        const res = await api.post('/users', {
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
          status: formData.status
        });
        if (res.data.success) {
          showNotification(`Pengguna "${formData.name}" berhasil ditambahkan.`);
          setIsFormModalOpen(false);
          fetchUsers();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan data pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (!newPassword || newPassword.length < 4) {
      setResetError('Password baru minimal 4 karakter.');
      return;
    }

    try {
      setResetting(true);
      setResetError('');
      const res = await api.patch(`/users/${resettingUser.id}/reset-password`, {
        newPassword
      });
      if (res.data.success) {
        showNotification(`Password untuk akun "${resettingUser.name}" berhasil di-reset.`);
        setResettingUser(null);
      }
    } catch (err: any) {
      setResetError(err.response?.data?.message || 'Gagal mereset password.');
    } finally {
      setResetting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!togglingUser) return;
    try {
      setToggling(true);
      const newStatus = togglingUser.status === 'Active' ? 'Inactive' : 'Active';
      const res = await api.patch(`/users/${togglingUser.id}/status`, { status: newStatus });
      if (res.data.success) {
        showNotification(`Status akun "${togglingUser.name}" diubah menjadi ${newStatus}.`);
        setTogglingUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      showNotification(err.response?.data?.message || 'Gagal mengubah status.');
      setTogglingUser(null);
    } finally {
      setToggling(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      setDeleting(true);
      setDeleteError('');
      const res = await api.delete(`/users/${deletingUser.id}`);
      if (res.data.success) {
        showNotification(`Pengguna "${deletingUser.name}" berhasil dihapus.`);
        setDeletingUser(null);
        fetchUsers();
      }
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Gagal menghapus pengguna.');
    } finally {
      setDeleting(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2.5">
            <Users className="text-[#835227]" size={22} />
            <span>Kelola Kasir & Pengguna 👥</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Kelola akun kasir, hak akses login, dan password petugas toko
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={fetchUsers}
            icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            aria-label="Refresh Pengguna"
            className="rounded-2xl"
          >
            Segarkan
          </Button>

          <Button
            variant="accent"
            size="md"
            onClick={handleOpenAdd}
            icon={<UserPlus size={18} />}
            className="rounded-2xl bg-[#835227] hover:bg-[#6F441E] text-white font-black shadow-md shadow-[#835227]/20"
          >
            Tambah Pengguna
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs font-bold animate-in fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs font-bold">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <Card className="p-5 space-y-4 rounded-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Cari nama atau username pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={18} />}
            />
          </div>

          {/* Role Filter */}
          <div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              options={[
                { value: 'ALL', label: 'Semua Peran (Role)' },
                { value: 'ADMIN', label: 'ADMIN (Akses Penuh)' },
                { value: 'KASIR', label: 'KASIR (Layar Kasir)' }
              ]}
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              options={[
                { value: 'ALL', label: 'Semua Status' },
                { value: 'Active', label: 'Active (Aktif)' },
                { value: 'Inactive', label: 'Inactive (Nonaktif)' }
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Users Cards Grid (Tablet-First) */}
      {loading && users.length === 0 ? (
        <LoadingSpinner size="lg" label="Memuat daftar pengguna..." />
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center mb-3">
            <Users size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">
            Pengguna Tidak Ditemukan
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Coba sesuaikan kata kunci pencarian atau filter status/role Anda.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {users.map((u) => {
            const isSelf = currentUser?.id === u.id;

            return (
              <Card
                key={u.id}
                className="p-5 sm:p-6 flex flex-col justify-between hover:shadow-md transition-all border-slate-100 hover:border-amber-200 group"
              >
                <div>
                  {/* Top info row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#835227] text-white flex items-center justify-center font-black text-lg shadow-xs group-hover:scale-105 transition-transform">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-base font-black text-slate-900 truncate" title={u.name}>
                          {u.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono font-medium">@{u.username}</p>
                      </div>
                    </div>

                    <Badge variant={u.status === 'Active' ? 'success' : 'danger'}>
                      {u.status}
                    </Badge>
                  </div>

                  {/* Role & Stats */}
                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Peran Sistem:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-[#835227] bg-[#835227]/10 px-2.5 py-0.5 rounded-full text-[11px]">
                        <Shield size={12} />
                        <span>{u.role}</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Histori Transaksi:</span>
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Receipt size={13} className="text-[#835227]" />
                        <span>{u.transactionCount} Transaksi</span>
                      </span>
                    </div>

                    {isSelf && (
                      <p className="text-[10px] font-bold text-[#835227] bg-[#CBC6B2]/25 p-2 rounded-xl border border-[#CBC6B2]/60 text-center">
                        Akun yang sedang Anda gunakan saat ini
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between gap-1.5 pt-3 mt-4 border-t border-slate-100">
                  {/* Toggle Active/Inactive */}
                  <button
                    disabled={isSelf}
                    onClick={() => setTogglingUser(u)}
                    className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isSelf
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                        : u.status === 'Active'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                    }`}
                    title={isSelf ? 'Tidak dapat menonaktifkan akun sendiri' : 'Ubah Status Akun'}
                  >
                    {u.status === 'Active' ? <UserX size={14} /> : <UserCheck size={14} />}
                    <span>{u.status === 'Active' ? 'Nonaktifkan' : 'Aktifkan'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Reset Password */}
                    <button
                      onClick={() => handleOpenResetPassword(u)}
                      className="p-2 min-h-[38px] min-w-[38px] rounded-xl text-slate-500 hover:text-[#835227] hover:bg-[#835227]/10 transition-colors"
                      title="Reset Password"
                    >
                      <KeyRound size={16} />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-2 min-h-[38px] min-w-[38px] rounded-xl text-slate-500 hover:text-[#835227] hover:bg-slate-100 transition-colors"
                      title="Edit Pengguna"
                    >
                      <Edit2 size={16} />
                    </button>

                    {/* Delete */}
                    <button
                      disabled={isSelf}
                      onClick={() => {
                        setDeleteError('');
                        setDeletingUser(u);
                      }}
                      className={`p-2 min-h-[38px] min-w-[38px] rounded-xl transition-colors ${
                        isSelf
                          ? 'opacity-30 cursor-not-allowed text-slate-300'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL FORM TAMBAH / EDIT PENGGUNA */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-pos bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Nama Lengkap */}
          <Input
            label="Nama Lengkap *"
            placeholder="Contoh: Rahmat Hidayat"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
          />

          {/* Username */}
          <Input
            label="Username *"
            placeholder="Contoh: rahmat"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />

          {/* Password (Hanya saat Tambah Baru) */}
          {!editingUser && (
            <Input
              label="Password Awal *"
              type="password"
              placeholder="Minimal 4 karakter"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Role (Hanya ADMIN dan KASIR) */}
            <Select
              label="Peran (Role) *"
              value={formData.role}
              disabled={editingUser?.id === currentUser?.id}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              options={[
                { value: 'KASIR', label: 'KASIR (Layar Kasir POS)' },
                { value: 'ADMIN', label: 'ADMIN (Akses Penuh)' }
              ]}
            />

            {/* Status (Active / Inactive) */}
            <Select
              label="Status Akun *"
              value={formData.status}
              disabled={editingUser?.id === currentUser?.id}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
              options={[
                { value: 'Active', label: 'Active (Aktif)' },
                { value: 'Inactive', label: 'Inactive (Nonaktif)' }
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsFormModalOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              loading={submitting}
            >
              {editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL RESET PASSWORD */}
      {resettingUser && (
        <Modal
          isOpen={resettingUser !== null}
          onClose={() => setResettingUser(null)}
          title={`Reset Password: ${resettingUser.name}`}
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmResetPassword} className="space-y-4">
            <p className="text-xs text-slate-500">
              Masukkan password baru untuk akun <strong>@{resettingUser.username}</strong>. Password akan di-enkripsi dengan aman.
            </p>

            {resetError && (
              <div className="p-3 rounded-pos bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <Input
              label="Password Baru *"
              type="password"
              placeholder="Minimal 4 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setResettingUser(null)}
                disabled={resetting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={resetting}
              >
                Simpan Password Baru
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM DIALOG TOGGLE STATUS */}
      {togglingUser && (
        <ConfirmDialog
          isOpen={togglingUser !== null}
          onClose={() => setTogglingUser(null)}
          onConfirm={handleConfirmToggleStatus}
          title={togglingUser.status === 'Active' ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
          message={
            <div>
              Apakah Anda yakin ingin {togglingUser.status === 'Active' ? 'menonaktifkan' : 'mengaktifkan'} akun <strong>"{togglingUser.name}"</strong>?
              {togglingUser.status === 'Active' && (
                <p className="mt-2 text-slate-500 text-xs">
                  Pengguna yang dinonaktifkan tidak akan dapat masuk ke sistem POS hingga diaktifkan kembali.
                </p>
              )}
            </div>
          }
          confirmText={togglingUser.status === 'Active' ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
          variant={togglingUser.status === 'Active' ? 'warning' : 'primary'}
          loading={toggling}
        />
      )}

      {/* CONFIRM DIALOG HAPUS PENGGUNA */}
      {deletingUser && (
        <ConfirmDialog
          isOpen={deletingUser !== null}
          onClose={() => {
            setDeletingUser(null);
            setDeleteError('');
          }}
          onConfirm={handleConfirmDelete}
          title="Hapus Pengguna"
          message={
            deleteError ? (
              <div className="text-rose-600 font-medium">
                {deleteError}
              </div>
            ) : (
              <div>
                Apakah Anda yakin ingin menghapus akun <strong>"{deletingUser.name}"</strong>?
                {deletingUser.transactionCount > 0 && (
                  <p className="mt-2 text-rose-600 font-medium text-xs">
                    Peringatan: Pengguna ini memiliki riwayat {deletingUser.transactionCount} transaksi dan tidak disarankan dihapus.
                  </p>
                )}
              </div>
            )
          }
          confirmText={deleteError ? 'Mengerti' : 'Ya, Hapus Pengguna'}
          variant="danger"
          loading={deleting}
        />
      )}
    </div>
  );
};
