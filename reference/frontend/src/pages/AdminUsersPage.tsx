import React, { useState } from 'react';
import { Users, Search, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface SampleUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  enabled: boolean;
  createdAt: string;
}

export const AdminUsersPage: React.FC = () => {
  const { showSuccess } = useToast();
  const [users, setUsers] = useState<SampleUser[]>([
    { id: '1', fullName: 'Aarav Sharma', email: 'admin@donateconnect.in', role: 'ADMIN', enabled: true, createdAt: '2026-08-01' },
    { id: '2', fullName: 'Priya Patel', email: 'priya.patel@gmail.com', role: 'DONOR', enabled: true, createdAt: '2026-08-02' },
    { id: '3', fullName: 'Rahul Verma', email: 'rahul.verma@gmail.com', role: 'DONOR', enabled: true, createdAt: '2026-08-03' },
    { id: '4', fullName: 'Goonj Foundation Manager', email: 'contact@goonj.org', role: 'NGO', enabled: true, createdAt: '2026-08-01' },
    { id: '5', fullName: 'Vikram Singh', email: 'dispatch@donateconnect.in', role: 'VOLUNTEER', enabled: true, createdAt: '2026-08-02' },
    { id: '6', fullName: 'TCS CSR Wing', email: 'csr@tata.com', role: 'CORPORATE', enabled: true, createdAt: '2026-08-04' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = !u.enabled;
          showSuccess(`User account ${u.email} ${updated ? 'enabled' : 'disabled'}`);
          return { ...u, enabled: updated };
        }
        return u;
      })
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 py-6 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-400" />
            Admin User Management Console
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage platform accounts, role assignments, and toggle user active/suspended status
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['ALL', 'DONOR', 'NGO', 'VOLUNTEER', 'CORPORATE', 'ADMIN'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                roleFilter === r
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">User Name & Email</th>
                <th className="px-6 py-3.5">Assigned Role</th>
                <th className="px-6 py-3.5">Account Status</th>
                <th className="px-6 py-3.5">Registered Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{u.fullName}</div>
                    <div className="text-slate-400 text-[11px]">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-md border border-indigo-500/20 font-bold uppercase text-[10px]">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.enabled ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> SUSPENDED
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-400">{u.createdAt}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleUserStatus(u.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                        u.enabled
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {u.enabled ? 'Suspend Account' : 'Reactivate Account'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
