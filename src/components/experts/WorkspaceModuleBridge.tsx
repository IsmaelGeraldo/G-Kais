import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';

function noticeTone(message: string): Tone {
  const text = message.toLowerCase();
  if (/no se pudo|could not|error|fall/.test(text)) return 'error';
  if (/eliminad|guardad|cread|actualiz|restaur|integr|import|retir|list|deleted|saved|created|updated|restored|enrolled|imported|removed|ready/.test(text)) return 'success';
  return 'info';
}

export function WorkspaceModuleBridge({ children, forceSelectedListBlack = false }: { children: React.ReactNode; forceSelectedListBlack?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<{ id: number; message: string; tone: Tone } | null>(null);
  const lastMessageRef = useRef('');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let hideTimer: number | undefined;

    const scan = () => {
      const paragraphs = Array.from(root.querySelectorAll('p'));
      for (const element of paragraphs) {
        const className = typeof element.className === 'string' ? element.className : '';
        const looksLikeInlineNotice = className.includes('rounded-xl') && className.includes('px-4') && className.includes('py-3') && className.includes('text-xs') && className.includes('text-black/60');
        if (!looksLikeInlineNotice) continue;
        const message = element.textContent?.trim() || '';
        if (!message) continue;
        element.style.display = 'none';
        if (message !== lastMessageRef.current) {
          lastMessageRef.current = message;
          const id = Date.now();
          setNotice({ id, message, tone: noticeTone(message) });
          if (hideTimer !== undefined) window.clearTimeout(hideTimer);
          hideTimer = window.setTimeout(() => setNotice((current) => current?.id === id ? null : current), 4600);
        }
      }

      if (forceSelectedListBlack) {
        const buttons = Array.from(root.querySelectorAll('button')) as HTMLButtonElement[];
        buttons.forEach((button) => {
          const selectedByLegacyClass = button.className.includes('bg-[#F7F7F5]');
          if (selectedByLegacyClass) {
            button.dataset.gkaisSelectedList = 'true';
            button.style.background = '#111413';
            button.style.color = '#ffffff';
            button.querySelectorAll('p,span').forEach((child) => { (child as HTMLElement).style.color = 'inherit'; });
          } else if (button.dataset.gkaisSelectedList === 'true') {
            delete button.dataset.gkaisSelectedList;
            button.style.removeProperty('background');
            button.style.removeProperty('color');
            button.querySelectorAll('p,span').forEach((child) => { (child as HTMLElement).style.removeProperty('color'); });
          }
        });
      }
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, [forceSelectedListBlack]);

  const Icon = notice?.tone === 'error' ? XCircle : CheckCircle2;
  return <div ref={rootRef} className="relative">
    {children}
    {notice && <div className={`fixed right-5 top-20 z-[120] flex max-w-[390px] items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-[0_18px_55px_rgba(0,0,0,0.16)] ${notice.tone === 'error' ? 'border-[#A23A32]/20' : 'border-black/10'}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${notice.tone === 'error' ? 'text-[#8D332C]' : 'text-[#17603D]'}`} />
      <p className="flex-1 text-xs leading-5 text-black/65">{notice.message}</p>
      <button type="button" onClick={() => setNotice(null)} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-black/35 hover:bg-black/5"><X className="h-3.5 w-3.5" /></button>
    </div>}
  </div>;
}
