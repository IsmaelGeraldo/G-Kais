export type WorkspaceNavItem = {
  id: string;
  label: string;
  section: 'main' | 'people' | 'work' | 'intelligence';
};

export type ExpertsVerticalPreset = {
  id: 'experts';
  name: string;
  description: string;
  defaultKnowledgeTopics: string[];
  navigation: WorkspaceNavItem[];
  attentionRules: string[];
};

export const expertsVerticalPreset: ExpertsVerticalPreset = {
  id: 'experts',
  name: 'G-KAIS for Experts',
  description:
    'Preset para coaches, mentores, consultores, agencias y servicios high-ticket con seguimiento humano.',
  defaultKnowledgeTopics: [
    'calificación de oportunidades',
    'llamadas de diagnóstico',
    'onboarding',
    'objetivos y resultados esperados',
    'planes de acción personalizados',
    'sesiones y acuerdos',
    'hitos y compromisos',
    'accountability',
    'bloqueadores',
    'progreso',
    'renovación',
    'upsell y referidos'
  ],
  navigation: [
    { id: 'overview', label: 'Dashboard', section: 'main' },
    { id: 'priority', label: 'Priority Work', section: 'main' },
    { id: 'leads', label: 'Leads', section: 'people' },
    { id: 'clients', label: 'Clients', section: 'people' },
    { id: 'sessions', label: 'Sessions', section: 'work' },
    { id: 'tasks', label: 'Tasks', section: 'work' },
    { id: 'calendar', label: 'Calendar', section: 'work' },
    { id: 'copilot', label: 'G-KAIS Copilot', section: 'intelligence' },
    { id: 'knowledge', label: 'Knowledge', section: 'intelligence' }
  ],
  attentionRules: [
    'persona sin próxima acción',
    'compromiso vencido',
    'sesión cancelada o atrasada',
    'cliente sin actualización reciente',
    'renovación próxima sin plan',
    'onboarding incompleto'
  ]
};
