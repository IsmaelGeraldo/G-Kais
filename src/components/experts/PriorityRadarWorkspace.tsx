import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ListTodo,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
  Trash2,
  UserRoundCheck
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  addWorkTask,
  appendJournal,
  deleteWorkTask,
  getWorkPriority,
  loadTasks,
  recoverWorkTask,
  updateWorkTask,
  WORKSPACE_STATE_EVENT,
  type WorkActionType,
  type WorkTask
} from './workspaceState';

function ActionIcon({ kind }: { kind: WorkActionType }) {
  if (kind === 'email') return <Mail className="h-4 w-4" />;
  if (kind === 'whatsapp') return <MessageCircle className="h-4 w-4" />;
  if (kind === 'call') return <Phone className="h-4 w-4" />;
  if (kind === 'meeting') return <CalendarCheck2 className="h-4 w-4" />;
  return <ListTodo className="h-4 w-4" />;
}
function actionLabel(type: WorkActionType, language: Language): string {
  if (type === 'email') return 'Email';
  if (type === 'whatsapp') return 'WhatsApp';
  if (type === 'call') return language === 'es' ? 'Llamada' : 'Call';
  if (type === 'meeting') return language === 'es' ? 'Reunión' : 'Meeting';
  return language === 'es' ? 'Tarea interna' : 'Internal task';
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
function priorityMeta(task: WorkTask, language: Language) {
  const priority = getWorkPriority(task);
  if (priority === 'high') return { label: language === 'es' ? 'Alta' : 'High', className: 'bg-[#A23A32]/9 text-[#8D332C]' };
  if (priority === 'medium') return { label: language === 'es' ? 'Media' : 'Medium', className: 'bg-[#A46F16]/10 text-[#82570F]' };
  return { label: 'Normal', className: 'bg-[#0A3F4D]/8 text-[#0A3F4D]' };
}

export function PriorityRadarWorkspace({ language, onOpenClient }: { language: Language; onOpenClient: (id: string) => void }) {
  const [tasks, setTasks] = useState<WorkTask[]>(loadTasks);
  const [showDone, setShowDone] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [resultDraft, setResultDraft] = useState('');
  const [newType, setNewType] = useState<WorkActionType>('whatsapp');
  const [newNote, setNewNote] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newAssignee, setNewAssignee] = useState('Equipo');
  const [editingHistoryTaskId, setEditingHistoryTaskId] = useState<string | null>(null);
  const [historyTitle, setHistoryTitle] = useState('');
  const [historyNote, setHistoryNote] = useState('');
  const [historyResult, setHistoryResult] = useState('');
  const [historyType, setHistoryType] = useState<WorkActionType>('task');
  const [historyDate, setHistoryDate] = useState('');
  const [historyTime, setHistoryTime] = useState('');
  const [historyAssignee, setHistoryAssignee] = useState('Equipo');

  useEffect(() => {
    const refresh = () => setTasks(loadTasks());
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(WORKSPACE_STATE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const openTasks = useMemo(() => tasks
    .filter((task) => task.status !== 'done' && !task.deletedAt)
    .sort((a, b) => `${a.dueDate || '9999-12-31'}${a.dueTime || '23:59'}`.localeCompare(`${b.dueDate || '9999-12-31'}${b.dueTime || '23:59'}`)), [tasks]);
  const historyTasks = useMemo(() => tasks
    .filter((task) => task.status === 'done' || Boolean(task.deletedAt))
    .sort((a, b) => (b.deletedAt || b.completedAt || b.createdAt).localeCompare(a.deletedAt || a.completedAt || a.createdAt)), [tasks]);
  const pendingCount = openTasks.length;
  const delegatedCount = openTasks.filter((task) => task.assignee !== 'Mentor').length;

  const setAssignee = (task: WorkTask, assignee: string) => {
    setTasks(updateWorkTask(task.id, { assignee }));
    if (task.clientId) appendJournal(task.clientId, 'task', language === 'es' ? 'Tarea reasignada' : 'Task reassigned', `${task.title} → ${assignee}`);
  };
  const toggleWork = (task: WorkTask) => {
    if (activeTaskId === task.id) {
      setActiveTaskId(null);
      return;
    }
    setActiveTaskId(task.id);
    setResultDraft(task.result || '');
    setNewAssignee(task.assignee || 'Equipo');
  };
  const completeTask = (task: WorkTask) => {
    const result = resultDraft.trim();
    setTasks(updateWorkTask(task.id, { status: 'done', result }));
    appendJournal(task.clientId, 'task-result', language === 'es' ? 'Trabajo completado' : 'Work completed', result || task.title);
    setActiveTaskId(null);
    setResultDraft('');
  };
  const removeTask = (task: WorkTask) => {
    setTasks(deleteWorkTask(task.id));
    appendJournal(task.clientId, 'task', language === 'es' ? 'Tarea enviada al historial' : 'Task moved to history', task.title);
    if (activeTaskId === task.id) setActiveTaskId(null);
    if (editingHistoryTaskId === task.id) setEditingHistoryTaskId(null);
  };
  const recoverTask = (task: WorkTask) => {
    setTasks(recoverWorkTask(task.id));
    appendJournal(task.clientId, 'task', language === 'es' ? 'Tarea recuperada' : 'Task recovered', task.title);
  };
  const beginHistoryEdit = (task: WorkTask) => {
    setEditingHistoryTaskId(task.id);
    setHistoryTitle(task.title);
    setHistoryNote(task.note || '');
    setHistoryResult(task.result || '');
    setHistoryType(task.type);
    setHistoryDate(task.dueDate || '');
    setHistoryTime(task.dueTime || '');
    setHistoryAssignee(task.assignee || 'Equipo');
  };
  const saveHistoryEdit = (task: WorkTask) => {
    const title = historyTitle.trim();
    if (!title) return;
    setTasks(updateWorkTask(task.id, {
      title,
      note: historyNote.trim(),
      result: historyResult.trim(),
      type: historyType,
      dueDate: historyDate,
      dueTime: historyTime,
      assignee: historyAssignee
    }));
    appendJournal(task.clientId, 'task-result', language === 'es' ? 'Tarea completada corregida' : 'Completed task corrected', `${title}${historyResult.trim() ? ` · ${historyResult.trim()}` : ''}`);
    setEditingHistoryTaskId(null);
  };
  const createFollowUp = (task: WorkTask) => {
    const clean = newNote.trim();
    if (!clean) return;
    addWorkTask({
      clientId: task.clientId,
      clientName: task.clientName,
      title: clean,
      type: newType,
      note: clean,
      dueDate: newDate,
      dueTime: newTime,
      assignee: newAssignee,
      source: 'manual',
      confirmationEmail: newType === 'meeting' ? 'queued' : 'not-required'
    });
    appendJournal(task.clientId, 'task', language === 'es' ? 'Nueva acción desde Trabajo prioritario' : 'New action from Priority Work', `${actionLabel(newType, language)} · ${clean} · ${newAssignee}`);
    setNewNote('');
    setNewDate('');
    setNewTime('');
    setTasks(loadTasks());
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'COLA DE EJECUCIÓN' : 'EXECUTION QUEUE'}</p>
          <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Trabajo prioritario y delegación' : 'Priority work and delegation'}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{language === 'es' ? 'Ejecuta, registra resultados, crea seguimientos, reasigna o reprograma sin salir de esta página.' : 'Execute, record results, create follow-ups, reassign or reschedule without leaving this page.'}</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl bg-[#F7F7F5] px-3.5 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'ABIERTAS' : 'OPEN'}</p><p className="mt-1 text-lg font-semibold">{pendingCount}</p></div>
          <div className="rounded-xl bg-[#F7F7F5] px-3.5 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'DELEGADAS' : 'DELEGATED'}</p><p className="mt-1 text-lg font-semibold">{delegatedCount}</p></div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
        <p className="text-xs text-black/40">{language === 'es' ? 'La cola solo muestra trabajo pendiente.' : 'The queue only shows pending work.'}</p>
        <label className="flex items-center gap-2 text-xs text-black/45"><input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />{language === 'es' ? 'Mostrar historial' : 'Show history'}</label>
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(10,10,10,0.025)]">
      <div className="hidden grid-cols-[minmax(240px,1.25fr)_90px_105px_145px_145px_100px] gap-3 border-b border-black/7 bg-[#FAFAF8] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35 lg:grid"><span>{language === 'es' ? 'Trabajo' : 'Work'}</span><span>{language === 'es' ? 'Prioridad' : 'Priority'}</span><span>{language === 'es' ? 'Tipo' : 'Type'}</span><span>{language === 'es' ? 'Cuándo' : 'When'}</span><span>{language === 'es' ? 'Responsable' : 'Assignee'}</span><span /></div>
      <div className="divide-y divide-black/5">
        {openTasks.map((task) => {
          const priority = priorityMeta(task, language);
          const opened = activeTaskId === task.id;
          return <div key={task.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(240px,1.25fr)_90px_105px_145px_145px_100px] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{task.title}</p>{task.source === 'session' && <span className="rounded-full bg-[#4556A6]/8 px-2 py-0.5 text-[9px] font-semibold text-[#4556A6]">{language === 'es' ? 'DESDE SESIÓN' : 'FROM SESSION'}</span>}</div>
              <button type="button" onClick={() => onOpenClient(task.clientId)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#0A3F4D] hover:underline">{task.clientName}<ChevronRight className="h-3 w-3" /></button>
              {task.note && <p className="mt-1 line-clamp-2 text-xs leading-5 text-black/45">{task.note}</p>}
            </div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold ${priority.className}`}>{priority.label}</span>
            <div className="flex items-center gap-2 text-xs text-black/55"><ActionIcon kind={task.type} /><span>{actionLabel(task.type, language)}</span></div>
            <div className="flex items-center gap-2 text-xs text-black/55"><Clock3 className="h-3.5 w-3.5" /><span>{formatDue(task, language)}</span></div>
            <label className="relative"><UserRoundCheck className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/30" /><select value={task.assignee} onChange={(event) => setAssignee(task, event.target.value)} className="w-full rounded-lg border border-black/8 bg-white py-2 pl-8 pr-2 text-xs"><option>Mentor</option><option>Equipo</option><option>Asistente</option><option>Ventas</option></select></label>
            <button type="button" onClick={() => toggleWork(task)} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white">{opened ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Trabajar' : 'Work')}<ChevronDown className={`h-3 w-3 transition ${opened ? 'rotate-180' : ''}`} /></button>

            {opened && <div className="rounded-xl border border-black/8 bg-[#FAFAF8] p-3 lg:col-span-6">
              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/38">{language === 'es' ? 'EJECUTAR TAREA' : 'EXECUTE TASK'}</p>
                  <label className="mt-2 block"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESULTADO / NOTA' : 'RESULT / NOTE'}</span><textarea value={resultDraft} onChange={(event) => setResultDraft(event.target.value)} rows={3} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
                  <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => completeTask(task)} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar y completar' : 'Save & complete'}</button><button type="button" onClick={() => removeTask(task)} className="inline-flex items-center gap-1.5 rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Enviar al historial' : 'Move to history'}</button></div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'NUEVA ACCIÓN SI SE REQUIERE' : 'NEW ACTION IF NEEDED'}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <select value={newType} onChange={(event) => setNewType(event.target.value as WorkActionType)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select>
                    <select value={newAssignee} onChange={(event) => setNewAssignee(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"><option>Mentor</option><option>Equipo</option><option>Asistente</option><option>Ventas</option></select>
                    <input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" />
                    <input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" />
                  </div>
                  <div className="mt-2 flex gap-2"><input value={newNote} onChange={(event) => setNewNote(event.target.value)} placeholder={language === 'es' ? 'Qué debe hacerse' : 'What needs to be done'} className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /><button type="button" onClick={() => createFollowUp(task)} className="shrink-0 rounded-full bg-[#0A3F4D] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Agregar acción' : 'Add action'}</button></div>
                </div>
              </div>
            </div>}
          </div>;
        })}
        {openTasks.length === 0 && <div className="p-8 text-center text-sm text-black/40">{language === 'es' ? 'No hay trabajo pendiente.' : 'No pending work.'}</div>}
      </div>
    </section>

    {showDone && <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'HISTORIAL DE TAREAS' : 'TASK HISTORY'}</p><h3 className="mt-2 text-lg font-semibold">{language === 'es' ? 'Completadas y eliminadas' : 'Completed and removed'}</h3><p className="mt-1 text-xs text-black/45">{language === 'es' ? 'Las más recientes aparecen primero. Las tareas completadas se pueden corregir.' : 'Most recent first. Completed tasks can be corrected.'}</p></div>
        <span className="rounded-full bg-[#0A3F4D]/8 px-3 py-1.5 text-xs font-semibold text-[#0A3F4D]">{historyTasks.length}</span>
      </div>
      <div className="mt-4 max-h-[430px] overflow-y-auto rounded-xl border border-black/7">
        <div className="divide-y divide-black/5">
          {historyTasks.map((task) => {
            const editingHistory = editingHistoryTaskId === task.id;
            return <div key={task.id} className="p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_140px_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{task.title}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${task.deletedAt ? 'bg-[#A23A32]/9 text-[#8D332C]' : 'bg-[#0A3F4D]/8 text-[#0A3F4D]'}`}>{task.deletedAt ? (language === 'es' ? 'ELIMINADA' : 'REMOVED') : (language === 'es' ? 'COMPLETADA' : 'COMPLETED')}</span></div>
                  <p className="mt-1 text-xs text-black/45">{task.clientName}{task.result ? ` · ${task.result}` : ''}</p>
                </div>
                <span className="text-xs text-black/50">{actionLabel(task.type, language)}</span>
                <span className="text-xs text-black/45">{formatDue(task, language)}</span>
                <div className="flex flex-wrap justify-end gap-2">
                  {task.deletedAt ? <button type="button" onClick={() => recoverTask(task)} className="inline-flex items-center gap-1.5 rounded-full border border-[#0A3F4D]/15 bg-white px-3 py-2 text-[10px] font-semibold text-[#0A3F4D]"><RotateCcw className="h-3.5 w-3.5" />{language === 'es' ? 'Recuperar' : 'Recover'}</button> : <><button type="button" onClick={() => editingHistory ? setEditingHistoryTaskId(null) : beginHistoryEdit(task)} className="rounded-full border border-black/10 bg-white px-3 py-2 text-[10px] font-semibold text-black/55">{editingHistory ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Editar' : 'Edit')}</button><button type="button" onClick={() => removeTask(task)} className="grid h-8 w-8 place-items-center rounded-full border border-black/8 text-black/35 hover:text-[#A23A32]" aria-label={language === 'es' ? 'Eliminar' : 'Delete'}><Trash2 className="h-3.5 w-3.5" /></button></>}
                </div>
              </div>
              {editingHistory && !task.deletedAt && <div className="mt-3 rounded-xl border border-black/8 bg-[#FAFAF8] p-3">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_130px_130px_105px_130px_auto] xl:items-end">
                  <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'TAREA' : 'TASK'}</span><input value={historyTitle} onChange={(event) => setHistoryTitle(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /></label>
                  <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'TIPO' : 'TYPE'}</span><select value={historyType} onChange={(event) => setHistoryType(event.target.value as WorkActionType)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select></label>
                  <input type="date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" />
                  <input type="time" value={historyTime} onChange={(event) => setHistoryTime(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" />
                  <select value={historyAssignee} onChange={(event) => setHistoryAssignee(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"><option>Mentor</option><option>Equipo</option><option>Asistente</option><option>Ventas</option></select>
                  <button type="button" onClick={() => saveHistoryEdit(task)} className="rounded-lg bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar' : 'Save'}</button>
                  <label className="md:col-span-1 xl:col-span-3"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOTA' : 'NOTE'}</span><textarea value={historyNote} onChange={(event) => setHistoryNote(event.target.value)} rows={1} className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /></label>
                  <label className="md:col-span-1 xl:col-span-3"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESULTADO' : 'RESULT'}</span><textarea value={historyResult} onChange={(event) => setHistoryResult(event.target.value)} rows={1} className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /></label>
                </div>
              </div>}
            </div>;
          })}
          {historyTasks.length === 0 && <div className="p-6 text-center text-sm text-black/40">{language === 'es' ? 'Aún no hay tareas en el historial.' : 'No task history yet.'}</div>}
        </div>
      </div>
    </section>}
  </div>;
}
