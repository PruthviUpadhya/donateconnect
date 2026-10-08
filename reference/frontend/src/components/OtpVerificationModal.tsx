import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, X, ShieldCheck, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';
import { ApiResponse } from '../types';

interface OtpVerificationModalProps {
  email: string;
  onVerified: () => void;
  onClose: () => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  email,
  onVerified,
  onClose,
}) => {
  const [otpCode, setOtpCode] = useState('');
  const [generatedDemoOtp, setGeneratedDemoOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<ApiResponse<{ email: string; otpCode: string }>>(
        '/auth/send-otp',
        { email }
      );
      setGeneratedDemoOtp(response.data.data.otpCode);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to dispatch OTP code');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    handleSendOtp();
  }, [email]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.post<ApiResponse<{ verified: boolean }>>('/auth/verify-otp', {
        email,
        otpCode,
      });
      setSuccess(true);
      setTimeout(() => {
        onVerified();
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or Expired OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-center space-y-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
            <KeyRound className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-white">2FA Security OTP Verification</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Enter the 6-digit Security Verification Code sent to <strong className="text-slate-200">{email}</strong>
          </p>
        </div>

        {generatedDemoOtp && (
          <div className="bg-indigo-950/60 border border-indigo-500/40 p-3 rounded-2xl text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-300">Live Demo SMS / Email Simulator Code:</span>
            <div className="text-2xl font-black text-white tracking-widest font-mono">{generatedDemoOtp}</div>
            <div className="text-[10px] text-slate-400">(Auto-generated 6-digit OTP)</div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2 justify-center font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm font-bold flex items-center justify-center gap-2 animate-bounce">
            <ShieldCheck className="w-5 h-5" /> 6-Digit OTP Verified Successfully!
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-Digit OTP"
              className="w-full text-center text-2xl font-black tracking-widest bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-mono"
            />

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:scale-[1.02] text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Verify OTP Code & Proceed
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
