import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { Produk } from './pages/admin/Produk';
import { Kategori } from './pages/admin/Kategori';
import { Transaksi } from './pages/admin/Transaksi';
import { RekapLaporan } from './pages/admin/RekapLaporan';
import { KasirUser } from './pages/admin/KasirUser';
import { Pengaturan } from './pages/admin/Pengaturan';
import { PosPlaceholder } from './pages/cashier/PosPlaceholder';
import { PWAInstallPrompt } from './components/ui/PWAInstallPrompt';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PWAInstallPrompt />
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Admin Panel Protected Routes (Role: ADMIN only) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="produk" element={<Produk />} />
              <Route path="kategori" element={<Kategori />} />
              <Route path="transaksi" element={<Transaksi />} />
              <Route path="rekap-laporan" element={<RekapLaporan />} />
              <Route path="kasir-user" element={<KasirUser />} />
              <Route path="pengaturan" element={<Pengaturan />} />
            </Route>
          </Route>

          {/* Kasir / POS Route (Role: KASIR and ADMIN) */}
          <Route element={<ProtectedRoute allowedRoles={['KASIR', 'ADMIN']} />}>
            <Route path="/pos" element={<PosPlaceholder />} />
          </Route>

          {/* Default Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
