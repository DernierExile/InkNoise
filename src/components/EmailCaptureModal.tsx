import { useState } from 'react';
import { X, Mail, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailCaptureModal({ isOpen, onClose }: EmailCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    const { error } = await supabase
      .from('email_captures')
      .insert({ email: trimmed });

    if (error) {
      if (error.code === '23505') {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg('Something went wrong. Please try again.');
      }
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative panel rounded-lg p-6 max-w-sm w-full shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors">
          <X className="w-4 h-4" />
        </button>

        {status === 'success' ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/25 flex items-center justify-center mx-auto mb-4">
              <Check className="w-5 h-5 text-[#00ff41]" />
            </div>
            <h2 className="text-sm font-bold text-white/80 mb-2">You're on the list</h2>
            <p className="text-[11px] text-white/35 leading-relaxed mb-4">
              We'll keep you updated on new features and the Pro release.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-[10px] font-mono-ui text-white/30 border border-white/[0.06] rounded-md hover:border-white/[0.12] hover:text-white/50 transition-all tracking-wider"
            >
              CLOSE
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-md bg-[#00ffff]/10 border border-[#00ffff]/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-[#00ffff]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white/80">Enjoying InkNoise?</h2>
              </div>
            </div>

            <p className="text-[11px] text-white/40 leading-relaxed mb-5">
              Register your email to never miss updates from InkNoise -- new algorithms, Pro features, and more.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus('idle'); setErrorMsg(''); }}
                  placeholder="you@email.com"
                  className="w-full px-3 py-2.5 bg-black/40 border border-white/[0.06] rounded-md text-[11px] text-white/80 placeholder-white/15 font-mono-ui outline-none focus:border-[#00ffff]/30 transition-colors"
                  autoFocus
                />
              </div>

              {status === 'error' && errorMsg && (
                <div className="flex items-center gap-1.5 text-[10px] text-red-400/70">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full px-3 py-2.5 bg-[#00ffff]/10 text-[#00ffff] border border-[#00ffff]/25 rounded-md hover:bg-[#00ffff]/15 hover:border-[#00ffff]/40 transition-all text-[10px] font-mono-ui tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'SUBSCRIBING...' : 'KEEP ME UPDATED'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full px-3 py-1.5 text-[9px] font-mono-ui text-white/15 hover:text-white/30 transition-colors tracking-wider"
              >
                NO THANKS
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
