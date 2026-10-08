import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSosStatus } from '../api/nextGenApi';
import { SosStatus } from '../types';
import { AlertOctagon, HeartHandshake } from 'lucide-react';

export const EmergencySosBanner: React.FC = () => {
  const [sos, setSos] = useState<SosStatus | null>(null);

  useEffect(() => {
    getSosStatus()
      .then((data) => setSos(data))
      .catch(() => setSos(null));
  }, []);

  if (!sos || !sos.active) return null;

  return (
    <div className="w-full bg-gradient-to-r from-red-950 via-rose-950 to-red-950 border-b border-red-500/50 py-3 px-4 text-white">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
        <div className="flex items-center gap-3">
          <AlertOctagon className="w-6 h-6 text-red-400 animate-pulse shrink-0" />
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-red-300">
              🚨 EMERGENCY DISASTER SOS MODE ACTIVE &mdash; {sos.disasterTitle}
            </div>
            <p className="text-xs text-slate-200 mt-0.5">{sos.priorityMessage}</p>
          </div>
        </div>

        <Link
          to="/donate/new?category=CLOTHES"
          className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition-all border border-red-400 shadow-lg shadow-red-600/40 shrink-0 flex items-center gap-1.5"
        >
          <HeartHandshake className="w-4 h-4" /> Priority Emergency Kit Donation &rarr;
        </Link>
      </div>
    </div>
  );
};
