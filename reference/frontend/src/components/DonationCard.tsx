import React from 'react';
import { Donation, DonationStatus } from '../types';
import { formatDate, getCategoryBadgeColor } from '../utils/formatters';
import { Tag, User, Building2 } from 'lucide-react';

interface DonationCardProps {
  donation: Donation;
  onStatusChange?: (id: string, newStatus: DonationStatus) => void;
  isNgoView?: boolean;
}

export const DonationCard: React.FC<DonationCardProps> = ({ donation, onStatusChange, isNgoView }) => {
  return (
    <div className="group bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 ${getCategoryBadgeColor(
              donation.category
            )}`}
          >
            <Tag className="w-3 h-3" />
            {donation.category}
          </span>
          <span
            className={`text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded ${
              donation.status === 'DELIVERED' || donation.status === 'ACCEPTED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : donation.status === 'REJECTED'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {donation.status}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
          {donation.category} Donation Request
        </h3>

        <p className="text-slate-400 text-sm mb-4 line-clamp-3 leading-relaxed">
          {donation.description || 'No detailed description provided.'}
        </p>

        {donation.photoUrls && donation.photoUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {donation.photoUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt="Donation attachment"
                className="w-14 h-14 object-cover rounded-lg border border-slate-800"
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium">{donation.ngo?.name || 'NGO Partner'}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>{donation.donor?.fullName}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Created: {formatDate(donation.createdAt)}</span>
          {donation.pickupDate && <span>Pickup: {donation.pickupDate}</span>}
        </div>

        {isNgoView && onStatusChange && (
          <div className="pt-2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Update Status:</span>
            <select
              value={donation.status}
              onChange={(e) => onStatusChange(donation.id, e.target.value as DonationStatus)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="REQUESTED">REQUESTED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="PICKED_UP">PICKED_UP</option>
              <option value="DELIVERED">DELIVERED</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
