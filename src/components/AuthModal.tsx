// =============================================================================
// AuthModal — Login / Signup with email/password + Google + GitHub OAuth.
// Brand-aligned, i18n-aware.
// =============================================================================

import { useState } from 'react';
import { X, AlertCircle, Mail, Lock } from 'lucide-react';
import { signIn, signUp, signInWithProvider } from '../lib/auth';
import { useT } from '../i18n/use-i18n';

type Mode = 'login' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: Mode;
  onSuccess?: () => void;
  contextLabel?: string; // i18n key fragment, e.g. "auth.contextSubscribe"
}

// Google "G" logo (multi-color, official-style). Per Google branding guidelines,
// we keep the multi-color mark on a neutral background.
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

// GitHub mark (single color, follows currentColor)
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
  contextLabel,
}: AuthModalProps) {
  const t = useT();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setEmail('');
    setPassword('');
    setStatus('idle');
    setErrorMsg('');
    setOauthLoading(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      setErrorMsg(t('auth.error.invalidEmail'));
      return;
    }
    if (password.length < 8) {
      setStatus('error');
      setErrorMsg(t('auth.error.passwordTooShort'));
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    const { error } =
      mode === 'login'
        ? await signIn(trimmed, password)
        : await signUp(trimmed, password);

    if (error) {
      setStatus('error');
      setErrorMsg(humanizeError(error.message, mode, t));
      return;
    }

    setStatus('success');
    onSuccess?.();
    setTimeout(() => {
      reset();
      onClose();
    }, 600);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    setErrorMsg('');
    const { error } = await signInWithProvider(provider);
    if (error) {
      setOauthLoading(null);
      setStatus('error');
      setErrorMsg(t('auth.error.oauthFailed'));
    }
    // Otherwise the browser is redirecting to the provider — no further action
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    reset();
  };

  const busy = status === 'loading' || status === 'success' || oauthLoading !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-bz-graphite/85 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative panel p-7 max-w-sm w-full">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-bz-system hover:text-bz-paper transition-colors duration-240"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-[10px] font-mono-ui text-bz-system tracking-[0.3em] mb-4 uppercase">
          {mode === 'login' ? t('auth.loginEyebrow') : t('auth.signupEyebrow')}
        </div>

        <h2 className="text-bz-h5 font-medium text-bz-paper tracking-tight mb-2">
          {mode === 'login' ? t('auth.loginTitle') : t('auth.signupTitle')}
        </h2>
        {contextLabel && (
          <p className="text-[11px] text-bz-interface/70 mb-5 leading-relaxed">
            {t('auth.contextSign', { context: t(contextLabel) })}
          </p>
        )}

        {/* OAuth providers */}
        <div className="space-y-2 mb-5">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 bg-bz-paper text-bz-graphite font-medium text-[12px] hover:bg-bz-paper-2 transition-colors duration-240 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon className="w-4 h-4" />
            {oauthLoading === 'google' ? t('common.loading') : t('auth.continueWithGoogle')}
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('github')}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 border border-bz-grid text-bz-paper font-medium text-[12px] hover:border-bz-system transition-colors duration-240 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GitHubIcon className="w-4 h-4" />
            {oauthLoading === 'github' ? t('common.loading') : t('auth.continueWithGitHub')}
          </button>
        </div>

        {/* OR divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-bz-grid" />
          <span className="text-[9px] font-mono-ui text-bz-system tracking-widest uppercase">
            {t('auth.or')}
          </span>
          <div className="flex-1 h-px bg-bz-grid" />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-bz-system absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder={t('auth.emailPlaceholder')}
              className="w-full pl-9 pr-3 py-2.5 bg-bz-graphite border border-bz-grid text-[12px] text-bz-paper placeholder-bz-system font-mono outline-none focus:border-bz-cyan transition-colors duration-240"
              autoComplete="email"
              disabled={busy}
            />
          </div>

          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-bz-system absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder={t('auth.passwordPlaceholder')}
              className="w-full pl-9 pr-3 py-2.5 bg-bz-graphite border border-bz-grid text-[12px] text-bz-paper placeholder-bz-system font-mono outline-none focus:border-bz-cyan transition-colors duration-240"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={busy}
            />
          </div>

          {status === 'error' && errorMsg && (
            <div className="flex items-center gap-1.5 text-[10px] text-bz-violet">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full px-3 py-2.5 bg-bz-cyan text-bz-graphite font-mono-ui text-[10px] tracking-widest font-semibold hover:bg-bz-cyan/90 transition-colors duration-240 disabled:opacity-40 disabled:cursor-not-allowed uppercase"
          >
            {status === 'loading'
              ? mode === 'login'
                ? t('auth.signingIn')
                : t('auth.creatingAccount')
              : status === 'success'
                ? t('auth.success')
                : mode === 'login'
                  ? t('auth.signInButton')
                  : t('auth.createAccountButton')}
          </button>

          <button
            type="button"
            onClick={switchMode}
            disabled={busy}
            className="w-full px-3 py-1.5 text-[10px] font-mono-ui text-bz-system hover:text-bz-paper transition-colors duration-240 tracking-widest"
          >
            {mode === 'login' ? t('auth.switchToSignup') : t('auth.switchToLogin')}
          </button>
        </form>
      </div>
    </div>
  );
}

function humanizeError(msg: string, mode: Mode, t: (k: string) => string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return t('auth.error.invalidCredentials');
  }
  if (lower.includes('already registered') || lower.includes('already in use')) {
    return t('auth.error.accountExists');
  }
  if (lower.includes('email rate limit')) {
    return t('auth.error.rateLimit');
  }
  if (lower.includes('user not found')) {
    return t('auth.error.userNotFound');
  }
  return mode === 'login' ? t('auth.error.loginFailed') : t('auth.error.signupFailed');
}
