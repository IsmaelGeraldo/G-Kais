import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { WorkspaceAuthChoices } from './WorkspaceAuthChoices';
import { firebaseAuth } from '../../lib/firebase';
import {
  acceptExpertWorkspaceInvite,
  getExpertWorkspaceInvite,
  type WorkspaceInvite
} from '../../services/expertsWorkspaceCore';

function friendlyError(value: string) {
  if (value === 'INVITE_EMAIL_MISMATCH') return 'La cuenta iniciada no coincide con el email de la invitación.';
  if (value === 'INVITE_EXPIRED') return 'La invitación venció. Solicita una nueva invitación al administrador del Workspace.';
  if (value === 'INVITE_NOT_FOUND') return 'La invitación ya no existe o el enlace no es válido.';
  if (value === 'INVITE_ALREADY_ACCEPTED') return 'Esta invitación ya fue utilizada. Inicia sesión normalmente para volver a tu Workspace.';
  if (value.includes('auth/unauthorized-domain')) return 'Este dominio todavía no está autorizado para iniciar sesión. Usa el enlace público de G-Kais o solicita uno nuevo.';
  if (value.includes('auth/popup-closed-by-user')) return 'El inicio de sesión fue cancelado antes de completarse.';
  return value;
}


export function WorkspaceInviteGate({ token }: { token: string }) {
  const [userReady, setUserReady] = useState(Boolean(firebaseAuth.currentUser));
  const [invite, setInvite] = useState<WorkspaceInvite | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'accepted'>('idle');
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(firebaseAuth, (user) => {
    setUserReady(Boolean(user));
    if (!user) setInvite(null);
  }), []);

  useEffect(() => {
    if (!userReady) return;
    setStatus('loading');
    setError('');
    void getExpertWorkspaceInvite(token)
      .then((result) => setInvite(result))
      .catch((err) => setError(err instanceof Error ? err.message : 'INVITE_LOAD_FAILED'))
      .finally(() => setStatus('idle'));
  }, [token, userReady]);

  const accept = async () => {
    setStatus('loading');
    setError('');
    try {
      await acceptExpertWorkspaceInvite(token);
      setStatus('accepted');
      window.setTimeout(() => {
        window.location.assign('/workspace/experts?view=priority');
      }, 450);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'INVITE_ACCEPT_FAILED');
    }
  };

  return <div className="grid min-h-screen place-items-center bg-[#F6F6F3] px-4 text-[#111413]">
    <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-7 shadow-[0_25px_70px_rgba(0,0,0,0.08)] md:p-9">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#111413] text-white"><ShieldCheck className="h-6 w-6" /></div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">G-KAIS WORKSPACE</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Invitación al equipo</h1>
      {!userReady ? <>
        <p className="mt-3 text-sm leading-6 text-black/50">Accede con el mismo correo que recibió esta invitación. Puedes utilizar Google, Microsoft o un enlace seguro enviado por email.</p>
        <WorkspaceAuthChoices inviteToken={token} />
      </> : <>
        {invite && <div className="mt-5 rounded-2xl bg-[#F7F7F5] p-4"><p className="text-sm font-semibold">{invite.displayName}</p><p className="mt-1 text-xs text-black/45">{invite.email}</p><p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">Rol asignado</p><p className="mt-1 text-sm font-medium">{invite.roleId}</p></div>}
        {status === 'accepted' ? <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#0A3F4D]/8 p-4 text-sm font-medium text-[#0A3F4D]"><CheckCircle2 className="h-5 w-5" />Invitación aceptada. Abriendo tu Workspace…</div>
          : invite?.status === 'accepted'
            ? <button type="button" onClick={() => window.location.assign('/login')} className="mt-6 w-full rounded-full bg-[#111413] px-5 py-3 text-sm font-semibold text-white">Esta invitación ya fue usada · Iniciar sesión</button>
            : <button type="button" disabled={!invite || status === 'loading'} onClick={() => void accept()} className="mt-6 w-full rounded-full bg-[#111413] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{status === 'loading' ? 'Verificando…' : 'Aceptar y entrar al Workspace'}</button>}
      </>}
      {error && <p className="mt-4 rounded-xl bg-[#A23A32]/8 px-3 py-2 text-xs text-[#8D332C]">{friendlyError(error)}</p>}
    </div>
  </div>;
}
