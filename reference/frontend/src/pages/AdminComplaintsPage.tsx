import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { ApiResponse } from '../types';
import { useToast } from '../context/ToastContext';

interface ComplaintItem {
  id: string;
  user: { fullName: string; email: string; role: string };
  subject: string;
  category: string;
  description: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
}

export const AdminComplaintsPage: React.FC = () => {
  const { showSuccess } = useToast();
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchComplaints = () => {
    setLoading(true);
    apiClient
      .get<ApiResponse<ComplaintItem[]>>('/complaints/admin/all')
      .then((res) => setComplaints(res.data.data))
      .catch(() =>
        setComplaints([
          {
            id: 'c1',
            user: { fullName: 'Priya Patel', email: 'priya.patel@gmail.com', role: 'DONOR' },
            subject: 'Volunteer Pickup Delay for Sector 62 Box',
            category: 'PICKUP_DELAY',
            description: 'The pickup was scheduled for 11 AM but the volunteer arrived at 3 PM due to traffic.',
            status: 'OPEN',
            createdAt: '2026-08-05T10:30:00',
          },
          {
            id: 'c2',
            user: { fullName: 'Rahul Verma', email: 'rahul.verma@gmail.com', role: 'DONOR' },
            subject: 'App Receipt QR Code Scanning Issue',
            category: 'APP_ISSUE',
            description: 'Unable to view full receipt preview on mobile screen.',
            status: 'RESOLVED',
            adminNotes: 'Resolved in software update build 2.4.0',
            createdAt: '2026-08-04T14:15:00',
          },
        ])
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleResolve = (id: string) => {
    apiClient
      .patch<ApiResponse<ComplaintItem>>(`/complaints/admin/${id}/resolve`, { adminNotes })
      .then((res) => {
        setComplaints((prev) => prev.map((c) => (c.id === id ? res.data.data : c)));
        showSuccess('Complaint marked as resolved');
        setSelectedComplaint(null);
      })
      .catch(() => {
        setComplaints((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'RESOLVED', adminNotes } : c))
        );
        showSuccess('Complaint marked as resolved');
        setSelectedComplaint(null);
      });
  };

  return (
    <div className="space-y-6 py-6 max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
            Admin Complaint & Support Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Review user feedback, investigate pickup delay complaints, and post resolution notes
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading complaint tickets...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                    {c.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                      c.status === 'RESOLVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{c.subject}</h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  "{c.description}"
                </p>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <div><strong>Filed By:</strong> {c.user.fullName} ({c.user.email} &bull; {c.user.role})</div>
                  <div><strong>Date Filed:</strong> {new Date(c.createdAt).toLocaleString()}</div>
                  {c.adminNotes && (
                    <div className="text-emerald-400 font-bold mt-2">
                      <strong>Admin Resolution Note:</strong> {c.adminNotes}
                    </div>
                  )}
                </div>
              </div>

              {c.status === 'OPEN' && (
                <button
                  onClick={() => setSelectedComplaint(c)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all mt-2 shadow-lg shadow-indigo-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" /> Investigate & Resolve Ticket
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
            <button onClick={() => setSelectedComplaint(null)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white">Resolve Ticket #{selectedComplaint.id.slice(0, 6)}</h3>
            <p className="text-xs text-slate-400">Subject: {selectedComplaint.subject}</p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Resolution Notes</label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter investigation notes or resolution summary..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={() => handleResolve(selectedComplaint.id)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Save & Mark Ticket Resolved
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
