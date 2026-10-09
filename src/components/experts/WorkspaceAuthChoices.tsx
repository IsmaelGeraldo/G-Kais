import { useEffect, useState } from 'react';
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  OAuthProvider,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithEmailLink,
  signInWithPopup
} from 'firebase/auth';
import { LogIn, Mail, ShieldCheck } from 'lucide-react';
import { firebaseAuth } from '../../lib/firebase';
import { buildPublicAppUrl } from '../../config/publicAppUrl';

const PENDING_EMAIL_KEY = 'gkais-workspace-email-signin';

function authError(cause: unknown): string {
  const code = cause && typeof cause === 'object' && 'code' in cause
    ? String((cause as {code?: unknown}).code || '') : '';
  if (code === 'auth/popup-blocked') return 'El navegador bloqueó la ventana de acceso. Permite las ventanas emergentes de G-Kais.';
  if (code === 'auth/popup-closed-by-user') return 'Se canceló el inicio de sesión.';
  if (code === 'auth/account-exists-with-different-credential') return 'Este correo ya tiene una cuenta con otro método. Entra primero con ese método para conservar el acceso y vincular tu cuenta de forma segura.';
  if (code === 'auth/operation-not-allowed') return 'Este método todavía no está habilitado en Firebase Authentication. Contacta al administrador de G-Kais.';
  if (code === 'auth/unauthorized-domain') return 'Este dominio no está autorizado en Firebase Authentication. Utiliza la dirección pública de G-Kais.';
  if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') return 'El enlace ya caducó o fue utilizado. Solicita uno nuevo.';
  if (code === 'auth/invalid-email') return 'Revisa la dirección de correo electrónico.';
  return cause instanceof Error ? cause.message : 'No se pudo iniciar sesión. Inténtalo nuevamente.';
}

/**
 * Provider sign-in and passwordless email link are shared by login and invitation.
 * Firebase retains its own UID; workspace membership is never created implicitly.
 */
export function WorkspaceAuthChoices({ inviteToken }: { inviteToken?: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [hasLink, setHasLink] = useState(() => isSignInWithEmailLink(firebaseAuth, window.location.href));

  const completeLink = async (requestedEmail: string) => {
    if (!requestedEmail.trim()) {
      setError('Indica el correo electrónico que recibió el enlace.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setPersistence(firebaseAuth, browserLocalPersistence);
      await signInWithEmailLink(firebaseAuth, requestedEmail.trim().toLowerCase(), window.location.href);
      window.localStorage.removeItem(PENDING_EMAIL_KEY);
      const cleanUrl = new URL(window.location.href);
      for (const key of ['mode', 'oobCode', 'apiKey', 'lang', 'continueUrl', 'tenantId']) cleanUrl.searchParams.delete(key);
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      setHasLink(false);
      setNeedsEmail(false);
    } catch (cause) {
      setError(authError(cause));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!hasLink) return;
    const stored = window.localStorage.getItem(PENDING_EMAIL_KEY) || '';
    if (stored) void completeLink(stored);
    else setNeedsEmail(true);
    // The Firebase link is processed once on mount; avoid retrying on every input change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providerSignIn = async (providerName: 'google' | 'microsoft') => {
    setBusy(true);
    setError('');
    try {
      const provider = providerName === 'google' ? new GoogleAuthProvider() : new OAuthProvider('microsoft.com');
      provider.setCustomParameters({ prompt: 'select_account' });
      await setPersistence(firebaseAuth, browserLocalPersistence);
      await signInWithPopup(firebaseAuth, provider);
    } catch (cause) {
      setError(authError(cause));
    } finally {
      setBusy(false);
    }
  };

  const requestEmailLink = async () => {
    const recipient = email.trim().toLowerCase();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(recipient)) {
      setError('Introduce un correo electrónico válido.');
      return;
    }
    setBusy(true);
    setError('');
    setSent(false);
    try {
      const pathname = inviteToken ? '/workspace/experts' : '/login';
      const params = inviteToken ? new URLSearchParams({ invite: inviteToken }) : undefined;
      const url = buildPublicAppUrl(pathname, params);
      await sendSignInLinkToEmail(firebaseAuth, recipient, { url, handleCodeInApp: true });
      window.localStorage.setItem(PENDING_EMAIL_KEY, recipient);
      setSent(true);
    } catch (cause) {
      setError(authError(cause));
    } finally {
      setBusy(false);
    }
  };

  if (hasLink) return <div className="mt-6 space-y-3">
    {needsEmail && <>
      <label htmlFor="gkais-email-confirm" className="block text-xs text-black/60">Confirma el correo que recibió el enlace</label>
      <input id="gkais-email-confirm" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm" placeholder="nombre@empresa.com" />
      <button type="button" disabled={busy} onClick={() => void completeLink(email)}
        className="w-full rounded-full bg-[#111413] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Confirmar correo e ingresar</button>
    </>}
    {busy && <p className="text-xs text-black/45">Verificando enlace seguro…</p>}
    {error && <p role="alert" className="rounded-xl bg-[#A23A32]/8 p-3 text-xs text-[#8D332C]">{error}</p>}
  </div>;

  return <div className="mt-6 space-y-3">
    <button type="button" disabled={busy} onClick={() => void providerSignIn('google')}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#111413] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">
      <LogIn className="h-4 w-4"/>Continuar con Google
    </button>
    <button type="button" disabled={busy} onClick={() => void providerSignIn('microsoft')}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#111413] disabled:opacity-40">
      <ShieldCheck className="h-4 w-4"/>Continuar con Microsoft
    </button>
    <div className="relative py-1 text-center text-[11px] text-black/40">o recibe un enlace seguro en tu correo</div>
    <div className="flex min-w-0 gap-2">
      <input type="email" autoComplete="email" aria-label="Correo electrónico" placeholder="nombre@empresa.com"
        value={email} onChange={(event) => {setEmail(event.target.value); setSent(false);}}
        onKeyDown={(event) => { if (event.key === 'Enter') void requestEmailLink(); }}
        className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"/>
      <button type="button" disabled={busy || !email.trim()} onClick={() => void requestEmailLink()}
        className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#111413] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-40">
        <Mail className="h-3.5 w-3.5"/>Enviar enlace
      </button>
    </div>
    {sent && <p role="status" className="rounded-xl bg-[#17603D]/8 p-3 text-xs text-[#17603D]">Enlace solicitado. Revisa tu correo, incluidos los mensajes no deseados. El enlace de acceso no es la invitación de equipo.</p>}
    {error && <p role="alert" className="rounded-xl bg-[#A23A32]/8 p-3 text-xs text-[#8D332C]">{error}</p>}
  </div>;
}
