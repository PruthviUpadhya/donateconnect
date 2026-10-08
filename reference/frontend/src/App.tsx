import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { NgoListPage } from './pages/NgoListPage';
import { NgoDetailPage } from './pages/NgoDetailPage';
import { ImpactPage } from './pages/ImpactPage';
import { MapViewPage } from './pages/MapViewPage';
import { SmartLockersPage } from './pages/SmartLockersPage';
import { BlockchainLedgerPage } from './pages/BlockchainLedgerPage';
import { CircularMarketplacePage } from './pages/CircularMarketplacePage';
import { DriverDashboardPage } from './pages/DriverDashboardPage';
import { CorporateDashboardPage } from './pages/CorporateDashboardPage';
import { CreateDonationPage } from './pages/CreateDonationPage';
import { MyDonationsPage } from './pages/MyDonationsPage';
import { DonorProfilePage } from './pages/DonorProfilePage';
import { NgoDashboardPage } from './pages/NgoDashboardPage';
import { NgoInventoryPage } from './pages/NgoInventoryPage';
import { NgoProfilePage } from './pages/NgoProfilePage';
import { AdminOverviewPage } from './pages/AdminOverviewPage';
import { AdminNgosPage } from './pages/AdminNgosPage';
import { AdminDonationsPage } from './pages/AdminDonationsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NgoRegisterPage } from './pages/NgoRegisterPage';
import { DriverRegisterPage } from './pages/DriverRegisterPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { EmergencySosBanner } from './components/EmergencySosBanner';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
          <EmergencySosBanner />
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/ngos" element={<NgoListPage />} />
              <Route path="/ngos/:id" element={<NgoDetailPage />} />
              <Route path="/impact" element={<ImpactPage />} />
              <Route path="/map" element={<MapViewPage />} />
              <Route path="/lockers" element={<SmartLockersPage />} />
              <Route path="/blockchain-ledger" element={<BlockchainLedgerPage />} />
              <Route path="/circular-market" element={<CircularMarketplacePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register-ngo" element={<NgoRegisterPage />} />
              <Route path="/register-driver" element={<DriverRegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Protected Profile Route */}
              <Route element={<ProtectedRoute allowedRoles={['DONOR', 'NGO', 'VOLUNTEER', 'CORPORATE', 'ADMIN']} />}>
                <Route path="/profile" element={<DonorProfilePage />} />
              </Route>

              {/* Protected Donor Routes */}
              <Route element={<ProtectedRoute allowedRoles={['DONOR', 'ADMIN']} />}>
                <Route path="/donate/new" element={<CreateDonationPage />} />
                <Route path="/donations/new" element={<Navigate to="/donate/new" replace />} />
                <Route path="/my-donations" element={<MyDonationsPage />} />
                <Route path="/donations" element={<Navigate to="/my-donations" replace />} />
              </Route>

              {/* Protected NGO Routes */}
              <Route element={<ProtectedRoute allowedRoles={['NGO', 'ADMIN']} />}>
                <Route path="/ngo-dashboard" element={<NgoDashboardPage />} />
                <Route path="/ngo-dashboard/inventory" element={<NgoInventoryPage />} />
                <Route path="/ngo-dashboard/profile" element={<NgoProfilePage />} />
              </Route>

              {/* Protected Volunteer Driver Routes */}
              <Route element={<ProtectedRoute allowedRoles={['VOLUNTEER', 'ADMIN']} />}>
                <Route path="/driver-dashboard" element={<DriverDashboardPage />} />
              </Route>

              {/* Protected Corporate CSR Routes */}
              <Route element={<ProtectedRoute allowedRoles={['CORPORATE', 'ADMIN']} />}>
                <Route path="/csr-dashboard" element={<CorporateDashboardPage />} />
              </Route>

              {/* Protected Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminOverviewPage />} />
                <Route path="/admin/ngos" element={<AdminNgosPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/complaints" element={<AdminComplaintsPage />} />
                <Route path="/admin/donations" element={<AdminDonationsPage />} />
              </Route>
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
