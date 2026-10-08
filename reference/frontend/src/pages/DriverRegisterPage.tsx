import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Truck, Mail, Lock, Phone, MapPin, CheckCircle2, ShieldCheck, ArrowRight, ShieldAlert, KeyRound, Bike } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { OtpVerificationModal } from '../components/OtpVerificationModal';

interface DriverRegisterForm {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  cityArea: string;
  vehicleType: 'BIKE' | 'SCOOTER' | 'E_RICKSHAW' | 'VAN' | 'MINI_TRUCK';
  licenseNumber: string;
}

export const DriverRegisterPage: React.FC = () => {
  const { showSuccess } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingRegistrationData, setPendingRegistrationData] = useState<DriverRegisterForm | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DriverRegisterForm>();

  const onSubmit = (data: DriverRegisterForm) => {
    // Open 6-digit OTP verification modal
    setPendingRegistrationData(data);
  };

  const handleOtpVerified = () => {
    setPendingRegistrationData(null);
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      showSuccess('Volunteer Driver Registration Approved & Account Activated!');
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <Truck className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-white">Volunteer Delivery Partner Registration</h1>
          <p className="text-slate-400 text-xs mt-1">
            Join the Zepto/Blinkit style fast NGO pickup network & earn Karma Rewards
          </p>
        </div>

        <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Driver Onboarding Requirements:</strong> 2FA 6-digit phone OTP verification, valid driving license number, and vehicle details required.
          </span>
        </div>

        {submitted ? (
          <div className="bg-slate-950 p-6 rounded-2xl border border-emerald-500/30 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Driver Partner Account Active!</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Your Volunteer Driver profile has been verified and activated. You can now toggle your online status and receive instant pickup dispatch requests across your city.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              Log In to Driver Console <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  {...register('fullName', { required: 'Full name is required' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
                {errors.fullName && <p className="text-rose-400 text-xs mt-1">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="ramesh.driver@gmail.com"
                    {...register('email', { required: 'Email is required' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    {...register('password', { required: 'Password is required' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Mobile Number (For OTP) *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    {...register('phone', { required: 'Phone is required' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {errors.phone && <p className="text-rose-400 text-xs mt-1">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Vehicle Type *</label>
                <div className="relative">
                  <Bike className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    {...register('vehicleType', { required: 'Vehicle type is required' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BIKE">Motorcycle / Bike</option>
                    <option value="SCOOTER">Electric Scooter</option>
                    <option value="E_RICKSHAW">E-Rickshaw</option>
                    <option value="VAN">Cargo Van</option>
                    <option value="MINI_TRUCK">Mini Truck (Chota Hathi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Driving License # *</label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="DL-1420110012345"
                    {...register('licenseNumber', { required: 'License number is required' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {errors.licenseNumber && <p className="text-rose-400 text-xs mt-1">{errors.licenseNumber.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Primary Delivery City & Area *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Noida Sector 62 / Indiranagar Bengaluru"
                  {...register('cityArea', { required: 'City area is required' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              {errors.cityArea && <p className="text-rose-400 text-xs mt-1">{errors.cityArea.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:scale-[1.01] text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <KeyRound className="w-4 h-4" /> Verify Phone OTP & Register Driver Account
            </button>
          </form>
        )}

        {pendingRegistrationData && (
          <OtpVerificationModal
            email={pendingRegistrationData.email}
            onVerified={handleOtpVerified}
            onClose={() => setPendingRegistrationData(null)}
          />
        )}

        <div className="text-center mt-6 pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Looking to register as a Donor instead?{' '}
            <Link to="/register" className="text-indigo-400 font-semibold hover:underline">
              Donor Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
