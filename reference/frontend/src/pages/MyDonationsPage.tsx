import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyDonations } from '../api/donationApi';
import { Donation, DonationStatus } from '../types';
import { formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { CommentThread } from '../components/CommentThread';
import { LiveDriverTrackerModal } from '../components/LiveDriverTrackerModal';
import { PlusCircle, RefreshCw, HeartHandshake, Tag, Building2, Calendar, Filter, MessageSquare, X, Navigation } from 'lucide-react';

export const MyDonationsPage: React.FC = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Donation for Chat Modal
  const [activeChatDonation, setActiveChatDonation] = useState<Donation | null>(null);
  // Selected Donation for Uber-style Live Driver Tracker Modal
  const [activeTrackerDonation, setActiveTrackerDonation] = useState<Donation | null>(null);

  const fetchDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyDonations();
      const sorted = data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setDonations(sorted);
    } catch (err: any) {
      setError(err.message || 'Failed to load your donations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const getStatusBadgeStyle = (status: DonationStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'REJECTED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'PICKED_UP':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DELIVERED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'REQUESTED':
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const filteredDonations = donations.filter(
    (d) => statusFilter === 'ALL' || d.status === statusFilter
  );

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <HeartHandshake className="w-8 h-8 text-indigo-400" />
            My Donations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track your submitted donation requests and real-time pickup status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDonations}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/donate/new"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            New Donation Request
          </Link>
        </div>
      </div>

      {/* Status Filter Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-slate-500 shrink-0" />
        {['ALL', 'REQUESTED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              statusFilter === status
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="text-center py-16 bg-slate-900/20 rounded-2xl border border-slate-800">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading your submitted donations...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-rose-400 space-y-3">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchDonations}
            className="px-4 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800 space-y-3">
          <HeartHandshake className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-slate-300 font-semibold text-lg">No donation requests found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            {statusFilter === 'ALL'
              ? 'You have not created any donation requests yet.'
              : `No donations matching status "${statusFilter}".`}
          </p>
          <Link
            to="/donate/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
          >
            Create Your First Donation
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonations.map((donation) => (
            <div
              key={donation.id}
              className="bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-6 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {donation.category}
                  </span>
                  <span
                    className={`text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded border ${getStatusBadgeStyle(
                      donation.status
                    )}`}
                  >
                    {donation.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2 text-slate-300 font-semibold text-sm">
                  <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{donation.ngo?.name || 'NGO Partner'}</span>
                </div>

                <p className="text-slate-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                  {donation.description || 'No item description provided.'}
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
                <div className="space-y-1 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Requested On:</span>
                    <span>{formatDate(donation.createdAt)}</span>
                  </div>
                  {donation.pickupDate && (
                    <div className="flex items-center justify-between font-medium text-slate-300">
                      <span className="text-slate-500">Preferred Pickup:</span>
                      <span className="flex items-center gap-1 text-indigo-400">
                        <Calendar className="w-3 h-3" />
                        {donation.pickupDate}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Uber-Style Live GPS Driver Tracking Button */}
                  <button
                    onClick={() => setActiveTrackerDonation(donation)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold border border-indigo-500/30 transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    Live Driver GPS
                  </button>

                  {/* Direct Chat Button */}
                  <button
                    onClick={() => setActiveChatDonation(donation)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    Direct Chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uber-Style Live Driver Tracker Modal */}
      {activeTrackerDonation && (
        <LiveDriverTrackerModal
          donationTitle={`${activeTrackerDonation.category} (${activeTrackerDonation.ngo?.name || 'NGO'})`}
          driverName="Vikram Singh (Volunteer Logistics)"
          driverPhone="+91 98765 43210"
          onClose={() => setActiveTrackerDonation(null)}
        />
      )}

      {/* Direct Chat Modal */}
      {activeChatDonation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 relative flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  Chat with {activeChatDonation.ngo?.name}
                </h3>
                <p className="text-xs text-slate-400">Donation #{activeChatDonation.id.slice(0, 8)} ({activeChatDonation.category})</p>
              </div>
              <button
                onClick={() => setActiveChatDonation(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CommentThread donationId={activeChatDonation.id} currentUserId={user?.id} />
          </div>
        </div>
      )}
    </div>
  );
};
