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
      <div className="absolute inset-0 bg-bz-graphite/85 backdrop-blur-sm" onClick={onClose} />
      <div className="relative panel p-6 max-w-sm w-full">
        <button onClick={onClose} className="absolute top-3 right-3 text-bz-system hover:text-bz-paper transition-colors duration-240">
          <X className="w-4 h-4" />
        </button>

        <div className="text-[10px] font-mono-ui text-bz-system tracking-[0.3em] mb-4">SIGNAL · 001</div>

        {status === 'success' ? (
          <div className="text-center py-2">
            <div className="w-10 h-10 border border-bz-cyan flex items-center justify-center mx-auto mb-4">
              <Check className="w-5 h-5 text-bz-cyan" />
            </div>
            <h2 className="text-bz-h6 font-medium text-bz-interface mb-2 tracking-tight">You're on the list</h2>
            <p className="text-[11px] text-bz-paper/70 leading-relaxed mb-5">
              We'll signal you when new modules ship and the Bezier One offer goes live.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-[10px] font-mono-ui text-bz-paper border border-bz-grid hover:border-bz-system transition-colors duration-240 tracking-widest"
            >
              CLOSE
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 border border-bz-grid bg-bz-graphite flex items-center justify-center">
                <Mail className="w-4 h-4 text-bz-cyan" />
              </div>
              <div>
                <h2 className="text-bz-h6 font-medium text-bz-interface tracking-tight">Stay on signal</h2>
              </div>
            </div>

            <p className="text-[11px] text-bz-paper/70 leading-relaxed mb-5">
              Register your address to receive InkNoise updates — new algorithms, modules, and the Bezier One launch.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus('idle'); setErrorMsg(''); }}
                  placeholder="you@email.com"
                  className="w-full px-3 py-2.5 bg-bz-graphite border border-bz-grid text-[11px] text-bz-paper placeholder-bz-system font-mono-ui outline-none focus:border-bz-cyan transition-colors duration-240"
                  autoFocus
                />
              </div>

              {status === 'error' && errorMsg && (
                <div className="flex items-center gap-1.5 text-[10px] text-bz-violet">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full px-3 py-2.5 bg-bz-cyan text-bz-graphite font-mono-ui text-[10px] tracking-widest font-semibold hover:bg-bz-cyan/90 transition-colors duration-240 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'SUBSCRIBING...' : 'KEEP ME UPDATED'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full px-3 py-1.5 text-[9px] font-mono-ui text-bz-system hover:text-bz-paper transition-colors duration-240 tracking-widest"
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
