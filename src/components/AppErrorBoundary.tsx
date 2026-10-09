import React, { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean; errorName: string; errorMessage: string; componentNames: string };

/**
 * The full exception is logged to the browser console. In protected Vercel
 * branch previews, show a deliberately redacted diagnostic so QA can identify
 * a crashing React component without exposing tokens, emails, or query params.
 * Stable production retains the existing neutral error screen.
 */
function safeDiagnostic(value: string): string {
  return value
    .replace(/https?:\/\/[^\s'"<>]+/gi, '[URL]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[EMAIL]')
    .replace(/\b(?:AIza[0-9A-Za-z_-]{25,}|[A-Za-z0-9_-]{45,})\b/g, '[TOKEN]')
    .slice(0, 280);
}

function componentNames(info: ErrorInfo): string {
  const names = [...(info.componentStack || '').matchAll(/^\s+at\s+([A-Za-z_$][\w$]*)/gm)]
    .map((match) => match[1]).slice(0, 5);
  return names.join(' → ');
}

function isProtectedBranchPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.startsWith('g-kais-git-') && hostname.endsWith('.vercel.app');
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, errorName: '', errorMessage: '', componentNames: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      failed: true,
      errorName: safeDiagnostic(error?.name || 'Error'),
      errorMessage: safeDiagnostic(error?.message || 'Unknown render failure')
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[G-KAIS APP ERROR]', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      url: typeof window !== 'undefined' ? window.location.pathname : ''
    });
    this.setState({ componentNames: componentNames(info) });
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
          {isProtectedBranchPreview() && <div role="status" className="mt-4 rounded-xl border border-black/10 bg-[#F7F7F5] p-3">
            <p className="text-[11px] font-semibold text-black/65">Diagnóstico de vista previa (sin datos privados)</p>
            <p className="mt-2 select-text break-words font-mono text-[11px] leading-5 text-black/65">
              {this.state.errorName}: {this.state.errorMessage}
              {this.state.componentNames ? ` · ${this.state.componentNames}` : ''}
            </p>
          </div>}
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
