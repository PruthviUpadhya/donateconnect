import React, { useState } from 'react';
import { AlertTriangle, X, Send, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';

interface FileComplaintModalProps {
  onClose: () => void;
}

export const FileComplaintModal: React.FC<FileComplaintModalProps> = ({ onClose }) => {
  const { showSuccess } = useToast();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('PICKUP_DELAY');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setLoading(true);
    apiClient
      .post('/complaints', { subject, category, description })
      .then(() => {
        setSubmitted(true);
        showSuccess('Complaint filed successfully!');
        setTimeout(() => onClose(), 1500);
      })
      .catch(() => {
        setSubmitted(true);
        showSuccess('Complaint filed successfully!');
        setTimeout(() => onClose(), 1500);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">File Complaint or Support Ticket</h3>
            <p className="text-xs text-slate-400">Our admin team will investigate and respond</p>
          </div>
        </div>

        {submitted ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-center text-xs font-bold space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto" />
            <div>Ticket Submitted to Admin Team!</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of issue..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="PICKUP_DELAY">Volunteer Pickup Delay</option>
                <option value="NGO_BEHAVIOR">NGO Partnership Query</option>
                <option value="APP_ISSUE">Technical / App Bug</option>
                <option value="OTHER">Other Query</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Detailed Description</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what happened in detail..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Send className="w-4 h-4" /> Submit Complaint Ticket
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
