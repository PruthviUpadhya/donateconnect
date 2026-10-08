import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats } from '../api/adminApi';
import { AdminStats } from '../types';
import { Shield, Building2, PackageCheck, Clock, CheckCircle2, RefreshCw, ArrowRight, Layers } from 'lucide-react';

export const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-rose-500" />
            Admin Overview & Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            System-wide statistics aggregated directly via JPA database queries
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 flex items-center gap-2 text-xs font-semibold self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* 4 Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 h-36 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-rose-400 space-y-3">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchStats}
            className="px-4 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Donations */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-all flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-3xl font-extrabold text-white">{stats?.totalDonations || 0}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Total Donations</h3>
              <p className="text-xs text-slate-500 mt-0.5">All submitted requests across platform</p>
            </div>
          </div>

          {/* Active/Verified NGOs */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-3xl font-extrabold text-white">{stats?.verifiedNgos || 0}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Verified NGOs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Active non-profit organization partners</p>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-3xl font-extrabold text-white">{stats?.pendingRequests || 0}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Pending Requests</h3>
              <p className="text-xs text-slate-500 mt-0.5">Donation requests awaiting NGO response</p>
            </div>
          </div>

          {/* Completed Deliveries */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-3xl font-extrabold text-white">{stats?.completedDeliveries || 0}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Completed Deliveries</h3>
              <p className="text-xs text-slate-500 mt-0.5">Fully fulfilled and delivered donations</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
        <Link
          to="/admin/ngos"
          className="group bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Manage NGO Partners
            </h3>
            <p className="text-xs text-slate-400">
              Create new NGO accounts, toggle verified status, and manage partner accounts.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-4" />
        </Link>

        <Link
          to="/admin/donations"
          className="group bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-indigo-400" />
              Audit All Donations
            </h3>
            <p className="text-xs text-slate-400">
              View paginated table of all donations with filters for status, category, and NGO.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 ml-4" />
        </Link>
      </div>
    </div>
  );
};
