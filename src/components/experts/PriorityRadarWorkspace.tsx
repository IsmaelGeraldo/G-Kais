import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  ListTodo,
  Mail,
  Phone,
  UserRoundCheck
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  appendJournal,
  loadTasks,
  updateWorkTask,
  WORKSPACE_STATE_EVENT,
  type WorkActionType,
  type WorkTask
} from './workspaceState';

function ActionIcon({ kind }: { kind: WorkActionType }) {
  if (kind === 'email') return <Mail className="h-4 w-4" />;
  if (kind === 'call') return <Phone className="h-4 w-4" />;
  if (kind === 'meeting') return <CalendarCheck2 className="h-4 w-4" />;
  return <ListTodo className="h-4 w-4" />;
}

function actionLabel(type: WorkActionType, language: Language): string {
  if (type === 'email') return language === 'es' ? 'Email' : 'Email';
  if (type === 'call') return language === 'es' ? 'Llamada' : 'Call';
  if (type === 'meeting') return language === 'es' ? 'Reunión' : 'Meeting';
  return language === 'es' ? 'Tarea' : 'Task';
}

function formatDue(task: WorkTask, language: Language): string {
  if (!task.dueDate) return language === 'es' ? 'Sin fecha' : 'No date';
  try {
    const date = new Date(`${task.dueDate}T${task.dueTime || '12:00'}:00`);
    const formatted = new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short' }).format(date);
    return `${formatted}${task.dueTime ? ` · ${task.dueTime}` : ''}`;
  } catch {
    return `${task.dueDate}${task.dueTime ? ` · ${task.dueTime}` : ''}`;
  }
}

export function PriorityRadarWorkspace({ language, onOpenClient }: { language: Language; onOpenClient: (id: string) => void }) {
  const [tasks, setTasks] = useState<WorkTask[]>(loadTasks);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const refresh = () => setTasks(loadTasks());
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(WORKSPACE_STATE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const visible = useMemo(() => tasks
    .filter((task) => showDone || task.status !== 'done')
    .sort((a, b) => `${a.dueDate}${a.dueTime}`.localeCompare(`${b.dueDate}${b.dueTime}`)), [tasks, showDone]);
  const pendingCount = tasks.filter((task) => task.status !== 'done').length;
  const delegatedCount = tasks.filter((task) => task.status !== 'done' && task.assignee !== 'Mentor').length;

  const setStatus = (task: WorkTask, status: WorkTask['status']) => {
    setTasks(updateWorkTask(task.id, { status }));
    if (task.clientId) {
      appendJournal(
        task.clientId,
        'task',
        status === 'done' ? (language === 'es' ? 'Tarea completada' : 'Task completed') : (language === 'es' ? 'Tarea reabierta' : 'Task reopened'),
        task.title
      );
    }
  };

  const setAssignee = (task: WorkTask, assignee: string) => {
    setTasks(updateWorkTask(task.id, { assignee }));
    if (task.clientId) appendJournal(task.clientId, 'task', language === 'es' ? 'Tarea reasignada' : 'Task reassigned', `${task.title} → ${assignee}`);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'COLA DE EJECUCIÓN' : 'EXECUTION QUEUE'}</p>
            <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Trabajo prioritario y delegación' : 'Priority work and delegation'}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">
              {language === 'es'
                ? 'El Dashboard detecta quién necesita atención. Aquí se convierte esa atención en acciones concretas, con responsable y fecha.'
                : 'The Dashboard detects who needs attention. Here that attention becomes concrete work with an owner and due date.'}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-xl bg-[#F7F7F5] px-3.5 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'ABIERTAS' : 'OPEN'}</p><p className="mt-1 text-lg font-semibold">{pendingCount}</p></div>
            <div className="rounded-xl bg-[#F7F7F5] px-3.5 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'DELEGADAS' : 'DELEGATED'}</p><p className="mt-1 text-lg font-semibold">{delegatedCount}</p></div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
          <p className="text-xs text-black/40">{language === 'es' ? 'Completar, reasignar o abrir la ficha sin salir del flujo.' : 'Complete, reassign or open the record without leaving the flow.'}</p>
          <label className="flex items-center gap-2 text-xs text-black/45"><input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />{language === 'es' ? 'Mostrar completadas' : 'Show completed'}</label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(10,10,10,0.025)]">
        <div className="hidden grid-cols-[44px_minmax(220px,1.3fr)_120px_150px_150px_110px] gap-3 border-b border-black/7 bg-[#FAFAF8] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35 lg:grid">
          <span />
          <span>{language === 'es' ? 'Trabajo' : 'Work'}</span>
          <span>{language === 'es' ? 'Tipo' : 'Type'}</span>
          <span>{language === 'es' ? 'Cuándo' : 'When'}</span>
          <span>{language === 'es' ? 'Responsable' : 'Assignee'}</span>
          <span />
        </div>

        <div className="divide-y divide-black/5">
          {visible.map((task) => (
            <div key={task.id} className={`grid gap-3 px-4 py-4 transition lg:grid-cols-[44px_minmax(220px,1.3fr)_120px_150px_150px_110px] lg:items-center ${task.status === 'done' ? 'bg-black/[0.018] opacity-65' : ''}`}>
              <button type="button" onClick={() => setStatus(task, task.status === 'done' ? 'pending' : 'done')} className="grid h-8 w-8 place-items-center rounded-full border border-black/8 text-black/25 hover:border-[#0A3F4D]/30 hover:text-[#0A3F4D]" aria-label={language === 'es' ? 'Cambiar estado' : 'Change status'}>
                {task.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-[#0A3F4D]" /> : <Circle className="h-4 w-4" />}
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</p>{task.source === 'session' && <span className="rounded-full bg-[#4556A6]/8 px-2 py-0.5 text-[9px] font-semibold text-[#4556A6]">{language === 'es' ? 'DESDE SESIÓN' : 'FROM SESSION'}</span>}</div>
                <button type="button" onClick={() => onOpenClient(task.clientId)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#0A3F4D] hover:underline">{task.clientName}<ChevronRight className="h-3 w-3" /></button>
                {task.note && <p className="mt-1 line-clamp-2 text-xs leading-5 text-black/45">{task.note}</p>}
              </div>

              <div className="flex items-center gap-2 text-xs text-black/55"><ActionIcon kind={task.type} /><span>{actionLabel(task.type, language)}</span></div>
              <div className="flex items-center gap-2 text-xs text-black/55"><Clock3 className="h-3.5 w-3.5" /><span>{formatDue(task, language)}</span></div>
              <label className="relative">
                <UserRoundCheck className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" />
                <select value={task.assignee} onChange={(event) => setAssignee(task, event.target.value)} className="w-full rounded-lg border border-black/8 bg-white py-2 pl-8 pr-2 text-xs outline-none focus:border-[#0A3F4D]/30">
                  <option>Mentor</option>
                  <option>Equipo</option>
                  <option>Asistente</option>
                  <option>Ventas</option>
                </select>
              </label>
              <button type="button" onClick={() => onOpenClient(task.clientId)} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 px-3 py-2 text-[10px] font-semibold text-black/55 hover:border-[#0A3F4D]/30 hover:text-[#0A3F4D]">{language === 'es' ? 'Ver ficha' : 'Open'}<ChevronRight className="h-3 w-3" /></button>
            </div>
          ))}

          {visible.length === 0 && <div className="p-8 text-center text-sm text-black/40">{language === 'es' ? 'No hay trabajo pendiente.' : 'No pending work.'}</div>}
        </div>
      </section>
    </div>
  );
}
