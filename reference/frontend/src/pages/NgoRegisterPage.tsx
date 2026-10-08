import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Building2, Mail, Lock, Phone, MapPin, FileText, Globe, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface NgoRegisterForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  panCardNumber: string;
  registrationCertUrl: string;
  websiteUrl: string;
}

export const NgoRegisterPage: React.FC = () => {
  const { showSuccess } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NgoRegisterForm>();

  const onSubmit = (_data: NgoRegisterForm) => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      showSuccess('NGO Registration Application Submitted for Admin Verification!');
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black text-white">NGO Partner Registration Application</h1>
          <p className="text-slate-400 text-xs mt-1">
            Submit your non-profit organization details & compliance documents for Admin verification
          </p>
        </div>

        {submitted ? (
          <div className="bg-slate-950 p-6 rounded-2xl border border-emerald-500/30 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Application Received!</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Your NGO Registration Certificate & PAN details have been submitted to the Admin Console (<strong>pruthvi@donateconnect.in</strong>). Once approved, you can log in to your NGO Dashboard.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              Go to Login Page <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">NGO Name *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Goonj Foundation"
                    {...register('name', { required: 'NGO name is required' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Official Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="contact@goonj.org"
                    {...register('email', { required: 'Official email is required' })}
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
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Contact Phone *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="+91 11 2697 2351"
                    {...register('phone', { required: 'Phone is required' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {errors.phone && <p className="text-rose-400 text-xs mt-1">{errors.phone.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Official Office Address *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <textarea
                  rows={2}
                  placeholder="J-93 Sarita Vihar, Institutional Area, New Delhi..."
                  {...register('address', { required: 'Address is required' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              {errors.address && <p className="text-rose-400 text-xs mt-1">{errors.address.message}</p>}
            </div>

            {/* Compliance Document Upload Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Organization PAN Card Number *</label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. AAACG9842F"
                    {...register('panCardNumber', { required: 'PAN card is required' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {errors.panCardNumber && <p className="text-rose-400 text-xs mt-1">{errors.panCardNumber.message}</p>}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Registration Certificate # *</label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. REG-2024-DEL-8940"
                    {...register('registrationCertUrl', { required: 'Reg Cert is required' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {errors.registrationCertUrl && <p className="text-rose-400 text-xs mt-1">{errors.registrationCertUrl.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider">Website / Social Media Link (Optional)</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="https://goonj.org"
                  {...register('websiteUrl')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:scale-[1.01] text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? 'Submitting Application...' : 'Submit NGO Application for Verification'}
            </button>
          </form>
        )}

        <div className="text-center mt-6 pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Want to register as an individual Donor instead?{' '}
            <Link to="/register" className="text-indigo-400 font-semibold hover:underline">
              Donor Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
