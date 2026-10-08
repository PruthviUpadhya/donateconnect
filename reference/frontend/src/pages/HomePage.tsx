import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { getVerifiedNgos } from '../api/ngoApi';
import { NGOProfile } from '../types';
import { UrgentNeedsBanner } from '../components/UrgentNeedsBanner';
import {
  HeartHandshake,
  CheckCircle2,
  Server,
  Database,
  Code,
  ArrowRight,
  Zap,
  Building2,
  ShieldCheck,
  MapPin,
  Phone
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { health, loading: healthLoading } = useHealthCheck();
  const [ngos, setNgos] = useState<NGOProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVerifiedNgos()
      .then((data: NGOProfile[]) => setNgos(data.slice(0, 3)))
      .catch(() => setNgos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-12 py-8">
      {/* Urgent Appeal Campaigns Banner */}
      <UrgentNeedsBanner />

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-950/60 via-slate-900 to-slate-900 border border-slate-800 p-8 sm:p-12 lg:p-16">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            Verified NGO & Community Relief Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Connecting Generosity With{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-rose-400 bg-clip-text text-transparent">
              Verified NGOs
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            DonateConnect provides a role-isolated platform built with Spring Boot 3.x,
            PostgreSQL JPA, Spring Security JWT, and React 18 with TypeScript.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/donate/new"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <HeartHandshake className="w-5 h-5" />
              Donate Now
            </Link>
            <Link
              to="/impact"
              className="px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
            >
              View Impact Analytics
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* Live Backend Connection Status Card */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Backend Connection & Role Isolation
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    health?.status === 'UP'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  GET /api/health: {healthLoading ? 'CONNECTING...' : health?.status || 'DOWN'}
                </span>
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Spring Boot REST API enforcing database and query-level isolation for DONOR, NGO, and ADMIN roles.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-300">
            <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Health Response</div>
            <div className={health?.status === 'UP' ? 'text-emerald-400' : 'text-rose-400'}>
              {JSON.stringify(
                health || { status: 'DOWN', message: 'Backend server not running on port 8080' },
                null,
                2
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Spring Boot & Security</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Stateless JWT authentication filter chain with custom 401 & 403 JSON handlers.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 font-mono">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> BCrypt password encoder</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> @PreAuthorize role security</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cross-NGO access prevention</li>
          </ul>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-4">
            <Code className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">React 18 & AuthContext</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Stateful AuthContext with Axios interceptor attaching Authorization Bearer tokens.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 font-mono">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ProtectedRoute component</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Auto-logout on 401</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Donor-only register form</li>
          </ul>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Domain Entities</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            NGOProfile & Donation entities with JPA Specifications and enum validation.
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 font-mono">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> NGOProfile (OneToOne User)</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Donation (UUID, Enums)</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> @ElementCollection photoUrls</li>
          </ul>
        </div>
      </section>

      {/* Verified NGOs Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-400" />
              Verified NGO Partners
            </h2>
            <p className="text-slate-400 text-sm">Public verified organizations accepting donations</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Loading verified NGOs from backend...</p>
          </div>
        ) : ngos.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800 space-y-3">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-slate-300 font-semibold">No verified NGOs registered yet</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              Admins can register and verify NGO profiles using <code className="text-indigo-400">POST /api/admin/ngo</code>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ngos.map((ngo) => (
              <div key={ngo.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified NGO
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{ngo.name}</h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                    {ngo.description || 'Verified non-governmental partner organization.'}
                  </p>
                </div>
                <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{ngo.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{ngo.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
