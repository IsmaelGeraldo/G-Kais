import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ArrowLeft, Building2, ShieldCheck } from 'lucide-react';
import { WorkspaceAuthChoices } from './WorkspaceAuthChoices';
import { firebaseAuth } from '../../lib/firebase';
import { resolveValidExpertWorkspaceId } from '../../services/expertsWorkspaceMembers';

type AccessState = 'checking' | 'signed-out' | 'ready' | 'no-access';

export function WorkspaceLoginPage() {
  const [state, setState] = useState<AccessState>('checking');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const checkWorkspace = async () => {
    const user = firebaseAuth.currentUser;
    if (!user) {
      setState('signed-out');
      return false;
    }

    setState('checking');
    try {
      const workspaceId = await resolveValidExpertWorkspaceId(user);
      if (!workspaceId) {
        setState('no-access');
        return false;
      }
      setState('ready');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'WORKSPACE_ACCESS_CHECK_FAILED');
      setState('no-access');
      return false;
    }
  };

  useEffect(() => onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      setState('signed-out');
      return;
    }
    void checkWorkspace().then((allowed) => {
      if (allowed) window.location.replace('/workspace/experts');
    });
  }), []);

  const switchAccount = async () => {
    setBusy(true);
    setError('');
    try {
      await signOut(firebaseAuth);
      setState('signed-out');
    } finally {
      setBusy(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-[#F6F6F3] px-5 py-10 text-[#111413]">
    <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-7 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:p-9">
      <button
        type="button"
        onClick={() => window.location.assign('/')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-black/45 transition hover:text-black"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a G-KAIS
      </button>

      <div className="mt-7 grid h-12 w-12 place-items-center rounded-2xl bg-[#111413] text-white">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">G-KAIS WORKSPACE</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Iniciar sesión</h1>
      <p className="mt-3 text-sm leading-6 text-black/50">
        Accede con Google, Microsoft o un enlace enviado a tu correo. G-Kais abrirá únicamente el Workspace donde tengas una membresía activa.
      </p>

      {state === 'checking' && <div className="mt-6 rounded-2xl bg-[#F7F7F5] p-4 text-sm text-black/50">
        Verificando tu acceso…
      </div>}

      {state === 'signed-out' && <WorkspaceAuthChoices />}

      {state === 'ready' && <button
        type="button"
        onClick={() => window.location.assign('/workspace/experts')}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111413] px-5 py-3 text-sm font-semibold text-white"
      >
        <Building2 className="h-4 w-4" />
        Entrar al Workspace
      </button>}

      {state === 'no-access' && <div className="mt-6">
        <div className="rounded-2xl border border-[#A46F16]/15 bg-[#A46F16]/7 p-4">
          <p className="text-sm font-semibold text-[#6F4B0D]">Esta cuenta no tiene un Workspace activo.</p>
          <p className="mt-2 text-xs leading-5 text-[#6F4B0D]/75">
            Si perteneces a una empresa, usa la misma cuenta con la que aceptaste la invitación. Una invitación no crea un Workspace personal.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void switchAccount()}
          className="mt-4 w-full rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/65 disabled:opacity-40"
        >
          Usar otra cuenta
        </button>
      </div>}

      {error && <p className="mt-4 rounded-xl bg-[#A23A32]/8 px-3 py-2 text-xs text-[#8D332C]">{error}</p>}

      <p className="mt-7 text-center text-[11px] leading-5 text-black/35">
        El acceso depende de tu membresía y permisos dentro del Workspace de tu organización.
      </p>
    </section>
  </main>;
}
