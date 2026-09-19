import React, { useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { firebaseAuth } from '../lib/firebase';
import { fetchAdminLeads } from '../services/adminLeads';
import type { AdminLead } from '../types/admin';

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export const AdminPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(firebaseAuth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
  }, []);

  const loadLeads = async () => {
    setDataLoading(true);
    setError(null);
    try {
      const records = await fetchAdminLeads();
      setLeads(records);
      setSelectedId((current) =>
        current && records.some((record) => record.id === current)
          ? current
          : records[0]?.id || null
      );
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar los leads.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadLeads();
    } else {
      setLeads([]);
      setSelectedId(null);
    }
  }, [user]);

  const filteredLeads = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((lead) =>
      [
        lead.name,
        lead.company,
        lead.email,
        lead.contactChannel,
        lead.inquiryNotes,
        lead.message,
        lead.source
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [leads, queryText]);

  const selectedLead =
    filteredLeads.find((lead) => lead.id === selectedId) ||
    leads.find((lead) => lead.id === selectedId) ||
    filteredLeads[0] ||
    null;

  const metrics = useMemo(() => {
    const audits = leads.filter((lead) => lead.source === 'AUDIT').length;
    const contacts = leads.filter((lead) => lead.source === 'CONTACT').length;
    const whatsapp = leads.filter((lead) => lead.contactChannel === 'WhatsApp').length;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = leads.filter((lead) => lead.createdAt.startsWith(today)).length;
    return { total: leads.length, audits, contacts, whatsapp, todayCount };
  }, [leads]);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(firebaseAuth, provider);
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar sesión con Google.');
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#0A0A0A]" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] text-[#0A0A0A] flex items-center justify-center px-6">
        <section className="w-full max-w-lg border border-[#0A0A0A]/15 bg-white p-8 sm:p-10">
          <div className="flex items-center justify-between mb-10">
            <a href="/" className="inline-flex items-center text-xs font-mono-code uppercase tracking-wider text-[#6B6B6B] hover:text-[#0A0A0A]">
              <ArrowLeft className="w-3.5 h-3.5 mr-2" />
              G-KAIS
            </a>
            <span className="font-mono-code text-[10px] border border-[#E5E5E5] px-2 py-1 text-[#6B6B6B]">
              INTERNAL
            </span>
          </div>

          <ShieldCheck className="w-8 h-8 mb-5" />
          <p className="font-mono-code text-[11px] uppercase tracking-[0.22em] text-[#0A3F4D] font-semibold mb-2">
            PRIVATE OPERATIONS
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            G-KAIS Admin
          </h1>
          <p className="text-sm text-[#6B6B6B] leading-relaxed mb-8">
            Acceso interno para revisar solicitudes de auditoría y contactos registrados en Firestore.
          </p>

          {error && (
            <div className="mb-5 border border-red-200 bg-red-50 text-red-800 p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-[#0A0A0A] text-white px-5 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D] transition-colors"
          >
            Sign in with Google
          </button>

          <p className="mt-4 text-[10px] leading-relaxed font-mono-code text-[#8A8A8A]">
            Preview interno. La seguridad definitiva se cerrará a un UID administrador cuando podamos desplegar las reglas actualizadas.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#0A0A0A]">
      <header className="border-b border-[#E5E5E5] bg-white">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <a href="/" className="text-2xl font-extrabold tracking-tight">G-KAIS</a>
              <span className="font-mono-code text-[9px] border border-[#E5E5E5] px-2 py-1 text-[#6B6B6B]">
                ADMIN // PREVIEW
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1">Lead intake operations</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold">{user.displayName || user.email}</p>
              <p className="font-mono-code text-[9px] text-[#6B6B6B]">UID: {user.uid}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut(firebaseAuth)}
              className="inline-flex items-center border border-[#E5E5E5] bg-white px-3 py-2 text-xs hover:bg-[#F7F7F5]"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-8">
        <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="font-mono-code text-[10px] uppercase tracking-[0.2em] text-[#0A3F4D] font-bold mb-2">
              LIVE FIRESTORE INTAKE
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Opportunities inbox
            </h1>
          </div>
          <button
            type="button"
            onClick={loadLeads}
            disabled={dataLoading}
            className="inline-flex items-center justify-center border border-[#0A0A0A] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-white hover:bg-[#F0F0EE] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 text-red-800 p-3 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid grid-cols-2 md:grid-cols-5 border border-[#E5E5E5] bg-white mb-6">
          {[
            ['TOTAL', metrics.total],
            ['AUDITS', metrics.audits],
            ['CONTACTS', metrics.contacts],
            ['WHATSAPP', metrics.whatsapp],
            ['TODAY', metrics.todayCount]
          ].map(([label, value]) => (
            <div key={String(label)} className="p-5 border-r border-b md:border-b-0 border-[#E5E5E5] last:border-r-0">
              <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] mb-2">{label}</p>
              <p className="text-3xl font-extrabold">{value}</p>
            </div>
          ))}
        </section>

        <section className="border border-[#E5E5E5] bg-white">
          <div className="p-4 border-b border-[#E5E5E5] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">Lead intake</p>
              <p className="text-xs text-[#6B6B6B]">{filteredLeads.length} records visible</p>
            </div>
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Search name, company, email, channel..."
              className="w-full md:w-80 border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-xs focus:outline-none focus:border-[#0A3F4D]"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[560px]">
            <div className="xl:col-span-8 overflow-x-auto border-b xl:border-b-0 xl:border-r border-[#E5E5E5]">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] font-mono-code text-[10px] uppercase text-[#6B6B6B]">
                  <tr>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-3 py-3">Source</th>
                    <th className="px-3 py-3">Channel</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {dataLoading && leads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-[#6B6B6B]">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedId(lead.id)}
                        className={`cursor-pointer hover:bg-[#FAFAFA] ${selectedLead?.id === lead.id ? 'bg-[#F7F7F5]' : ''}`}
                      >
                        <td className="px-4 py-4">
                          <p className="font-bold text-sm">{lead.name}</p>
                          <p className="text-[10px] text-[#6B6B6B] mt-1">{lead.company || lead.email}</p>
                        </td>
                        <td className="px-3 py-4">
                          <span className="font-mono-code text-[9px] border border-[#E5E5E5] px-2 py-1">
                            {lead.source}
                          </span>
                        </td>
                        <td className="px-3 py-4">{lead.contactChannel || '—'}</td>
                        <td className="px-3 py-4">{lead.status}</td>
                        <td className="px-4 py-4 text-right font-mono-code text-[10px]">
                          {formatDate(lead.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <aside className="xl:col-span-4 bg-[#FAFAFA] p-5 sm:p-6">
              {selectedLead ? (
                <div>
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E5E5E5]">
                    <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                      RECORD // {selectedLead.source}
                    </span>
                    <span className="font-mono-code text-[9px] text-[#6B6B6B]">
                      {selectedLead.id}
                    </span>
                  </div>

                  <h2 className="text-2xl font-extrabold tracking-tight">{selectedLead.name}</h2>
                  <p className="text-sm text-[#6B6B6B] mt-1">{selectedLead.company || 'Direct contact'}</p>

                  <div className="mt-6 space-y-3 text-xs font-mono-code">
                    {[
                      ['EMAIL', selectedLead.email],
                      ['CHANNEL', selectedLead.contactChannel || '—'],
                      ['STATUS', selectedLead.status],
                      ['NOTIFICATION', selectedLead.notificationStatus],
                      ['CREATED', formatDate(selectedLead.createdAt)]
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex justify-between gap-4 border-b border-[#E5E5E5] pb-2">
                        <span className="text-[#6B6B6B]">{label}</span>
                        <span className="text-right font-semibold break-all">{value}</span>
                      </div>
                    ))}
                  </div>

                  {selectedLead.website && (
                    <a
                      href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex items-center text-xs underline text-[#0A3F4D]"
                    >
                      Open website <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}

                  <div className="mt-6 border border-[#E5E5E5] bg-white p-4">
                    <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] font-bold mb-2">
                      Intake context
                    </p>
                    <p className="text-sm leading-relaxed">
                      {selectedLead.inquiryNotes || selectedLead.message || 'No additional notes.'}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-[#E5E5E5] pt-4">
                    <p className="text-[10px] leading-relaxed text-[#8A8A8A]">
                      Read-only preview. Status editing, ownership and follow-up actions will be enabled after Firestore rules are locked to the administrator UID shown in the header.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex items-center justify-center text-center text-xs text-[#6B6B6B]">
                  Select a lead to inspect.
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
};
