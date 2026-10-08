import React, { useEffect, useState } from 'react';
import { getMyVolunteerTasks, updateVolunteerTaskStatus } from '../api/volunteerApi';
import { VolunteerTask } from '../types';
import { useToast } from '../context/ToastContext';
import { Truck, CheckCircle2, MapPin, Calendar, Clock, RefreshCw, Award, Star, Power, Camera, UploadCloud, X, ShieldCheck, Navigation, Radio, Check } from 'lucide-react';
import { LiveDriverTrackerModal } from '../components/LiveDriverTrackerModal';

export const DriverDashboardPage: React.FC = () => {
  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isGpsBroadcasting, setIsGpsBroadcasting] = useState(true);
  const [rewardPoints, setRewardPoints] = useState(350);
  const [trackingTask, setTrackingTask] = useState<VolunteerTask | null>(null);

  // Proof Photo Modals State
  const [activePhotoModal, setActivePhotoModal] = useState<{
    taskId: string;
    type: 'BEFORE_PICKUP' | 'AFTER_DELIVERY';
    targetStatus: VolunteerTask['status'];
  } | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  // Stored Proof Photos per Task
  const [proofPhotos, setProofPhotos] = useState<Record<string, { beforePickupPhoto?: string; afterDeliveryPhoto?: string }>>({
    'mock-1': {
      beforePickupPhoto: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=400&auto=format&fit=crop&q=60',
    },
  });

  const { showToast } = useToast();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getMyVolunteerTasks();
      setTasks(data);
    } catch {
      showToast('Failed to load volunteer tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedPhotoPreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmPhotoAndSubmitStatus = async () => {
    if (!activePhotoModal || !selectedPhotoPreview) {
      showToast('Please upload or capture a photo proof before proceeding', 'error');
      return;
    }

    const { taskId, type, targetStatus } = activePhotoModal;

    try {
      const updated = await updateVolunteerTaskStatus(taskId, targetStatus);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));

      // Save photo proof
      setProofPhotos((prev) => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          [type === 'BEFORE_PICKUP' ? 'beforePickupPhoto' : 'afterDeliveryPhoto']: selectedPhotoPreview,
        },
      }));

      if (targetStatus === 'COMPLETED') {
        setRewardPoints((prev) => prev + 50);
      }

      showToast(
        `${type === 'BEFORE_PICKUP' ? 'Proof of Pickup' : 'Proof of Handover/Delivery'} photo verified! Task marked as ${targetStatus}.`,
        'success'
      );

      setActivePhotoModal(null);
      setSelectedPhotoPreview(null);
    } catch {
      showToast('Failed to update task status', 'error');
    }
  };

  return (
    <div className="space-y-6 py-6 max-w-7xl mx-auto px-4">
      {/* Top Banner with Availability Status, GPS Stream Toggle & Rewards */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Truck className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white">Zepto/Blinkit Style Logistics Console</h1>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isOnline ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                {isOnline ? 'ONLINE & READY FOR DISPATCH' : 'OFFLINE'}
              </span>
              {isGpsBroadcasting && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-indigo-400 animate-ping" /> GPS Live Streaming (28.6139° N, 77.2090° E)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Manage live GPS routes, upload Before & After delivery photos, and earn Karma Rewards</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap self-start md:self-auto">
          {/* Availability Toggle */}
          <button
            onClick={() => {
              setIsOnline(!isOnline);
              showToast(`Availability status toggled to ${!isOnline ? 'ONLINE' : 'OFFLINE'}`, 'info');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border shadow-lg ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Power className="w-4 h-4" /> {isOnline ? 'Status: ONLINE' : 'Status: OFFLINE'}
          </button>

          {/* GPS Broadcast Switch */}
          <button
            onClick={() => {
              setIsGpsBroadcasting(!isGpsBroadcasting);
              showToast(`Zepto/Blinkit GPS Broadcast ${!isGpsBroadcasting ? 'STARTED' : 'PAUSED'}`, 'info');
            }}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
              isGpsBroadcasting
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" /> GPS Broadcast
          </button>

          {/* Karma Rewards Counter */}
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-amber-500/30 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <div className="text-left">
              <div className="text-[9px] uppercase font-black text-slate-400">Karma Rewards</div>
              <div className="text-sm font-black text-amber-400">{rewardPoints} Pts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Performance Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <div className="text-2xl font-black text-white">4.9 / 5.0</div>
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Volunteer Rating (42 Reviews)
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <div className="text-2xl font-black text-emerald-400">28 Pickups</div>
          <div className="text-xs text-slate-400">Completed Deliveries This Month</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
          <div className="text-2xl font-black text-indigo-400">98.4%</div>
          <div className="text-xs text-slate-400">On-Time Route Success Rate</div>
        </div>
      </div>

      {/* Assigned Tasks Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Assigned Dispatch Tasks ({tasks.length})</h3>
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            Loading assigned dispatch routes...
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800 space-y-3">
            <Truck className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-slate-300 font-semibold text-base">No active pickup assignments</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              You are ready to claim available donor pickup requests assigned by NGO partners.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => {
              const taskProofs = proofPhotos[task.id] || {};
              return (
                <div
                  key={task.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                        Category: {task.donation.category}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                        STATUS: {task.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">
                      Destination NGO: {task.donation.ngo?.name}
                    </h3>
                    <p className="text-xs text-slate-300 mb-3">{task.donation.description || 'Standard packaged donation.'}</p>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span><strong>Pickup Address:</strong> {task.donation.pickupAddress || 'Noida Sector 62, Uttar Pradesh'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span><strong>NGO Destination:</strong> {task.donation.ngo?.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span><strong>Pickup Date:</strong> {task.donation.pickupDate || 'Flexible'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span><strong>Route Note:</strong> {task.routeNotes}</span>
                      </div>
                    </div>

                    {/* Proof Photo Thumbnails Display */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                          <Camera className="w-3 h-3 text-amber-400" /> Proof of Pickup (Before)
                        </span>
                        {taskProofs.beforePickupPhoto ? (
                          <div className="relative group w-full h-16 rounded-lg overflow-hidden border border-emerald-500/40">
                            <img src={taskProofs.beforePickupPhoto} alt="Proof of pickup" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-12 rounded-lg bg-slate-950 border border-dashed border-slate-800 text-[10px] text-slate-500 flex items-center justify-center">
                            Not Uploaded Yet
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> Proof of Handover (After)
                        </span>
                        {taskProofs.afterDeliveryPhoto ? (
                          <div className="relative group w-full h-16 rounded-lg overflow-hidden border border-emerald-500/40">
                            <img src={taskProofs.afterDeliveryPhoto} alt="Proof of delivery" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-12 rounded-lg bg-slate-950 border border-dashed border-slate-800 text-[10px] text-slate-500 flex items-center justify-center">
                            Not Uploaded Yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-3 space-y-2">
                    {/* Live Tracker Preview Button */}
                    <button
                      onClick={() => setTrackingTask(task)}
                      className="w-full py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5 text-indigo-400" /> Open Zepto Live GPS Radar
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setActivePhotoModal({
                            taskId: task.id,
                            type: 'BEFORE_PICKUP',
                            targetStatus: 'IN_TRANSIT',
                          })
                        }
                        disabled={task.status === 'IN_TRANSIT'}
                        className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" /> 🚚 Pickup Photo & In-Transit
                      </button>

                      <button
                        onClick={() =>
                          setActivePhotoModal({
                            taskId: task.id,
                            type: 'AFTER_DELIVERY',
                            targetStatus: 'COMPLETED',
                          })
                        }
                        disabled={task.status === 'COMPLETED'}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> ✅ Handover Photo & Complete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proof Photo Upload Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 relative shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {activePhotoModal.type === 'BEFORE_PICKUP' ? 'Proof of Pickup Photo (Before)' : 'Proof of Delivery Photo (After)'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActivePhotoModal(null);
                  setSelectedPhotoPreview(null);
                }}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {activePhotoModal.type === 'BEFORE_PICKUP'
                ? 'Take or upload a clear photo of the items at the donor location before starting your delivery ride.'
                : 'Take or upload a photo of the items being handed over to the NGO representative at the destination hub.'}
            </p>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 text-center transition-colors bg-slate-950/40">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} id="proof-photo-input" className="hidden" />
              <label htmlFor="proof-photo-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                <UploadCloud className="w-8 h-8 text-indigo-400" />
                <span className="text-xs text-slate-200 font-semibold">Click to Snap / Upload Proof Photo</span>
                <span className="text-[10px] text-slate-500">Supports Camera & Gallery Uploads</span>
              </label>
            </div>

            {selectedPhotoPreview && (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-emerald-500/40">
                <img src={selectedPhotoPreview} alt="Selected Proof" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  PHOTO CAPTURED
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setActivePhotoModal(null);
                  setSelectedPhotoPreview(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmPhotoAndSubmitStatus}
                disabled={!selectedPhotoPreview}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm & Submit Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Driver Tracking Radar Modal */}
      {trackingTask && (
        <LiveDriverTrackerModal
          donationTitle={trackingTask.donation.description || trackingTask.donation.category}
          driverName={trackingTask.volunteer?.fullName || 'Active Driver'}
          driverPhone={trackingTask.volunteer?.email || '+91 98765 43210'}
          onClose={() => setTrackingTask(null)}
        />
      )}
    </div>
  );
};
