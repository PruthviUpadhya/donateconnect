import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Phone, MapPin, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const DonorProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [address, setAddress] = useState('Sector 62, Noida, Uttar Pradesh - 201309');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    showSuccess('Account profile information updated successfully!');
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 py-6 max-w-4xl mx-auto px-4">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <User className="w-8 h-8 text-indigo-400" />
          Donor Account & Profile Management
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your personal details, pickup location address, and view your verified impact badges
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Profile Overview Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-500/40 text-indigo-400 flex items-center justify-center font-black text-2xl mx-auto shadow-lg shadow-indigo-600/20">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.fullName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 mt-2">
              <ShieldCheck className="w-3 h-3" /> Verified {user?.role} Account
            </span>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>2FA OTP Protection:</span>
              <span className="text-emerald-400 font-bold">ACTIVE</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Impact Score:</span>
              <span className="text-indigo-400 font-bold">150 Points</span>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
            Personal & Pickup Address Details
          </h3>

          {saved && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Profile details saved successfully!
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Default Pickup Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              Save Profile Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
