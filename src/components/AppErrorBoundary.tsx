import React, { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[G-KAIS APP ERROR]', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      url: typeof window !== 'undefined' ? window.location.href : ''
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-[#F7F7F5] px-6">
        <section className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">G-KAIS</p>
          <h1 className="mt-2 text-xl font-semibold text-[#111413]">Esta vista no pudo cargarse correctamente.</h1>
          <p className="mt-2 text-sm leading-6 text-black/55">
            Tus datos no se eliminan por este error. Recarga la aplicación para reconstruir la vista.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-[#111413] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Recargar G-Kais
          </button>
        </section>
      </main>
    );
  }
}
