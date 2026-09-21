import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Database, MessageSquare, Mail, Calendar, Globe, FileSpreadsheet, Cpu, ArrowRight } from 'lucide-react';

interface ToolCategory {
  id: string;
  name: string;
  protocol: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  examples: string;
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'crm',
    name: 'CRM Systems',
    protocol: 'REST API & Webhooks',
    description: 'Automatic record creation, lifecycle deal progression, and bidirectional synchronization with zero manual rep entry.',
    icon: Database,
    examples: 'HubSpot, Salesforce, Pipedrive, Zoho, Custom DBs'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    protocol: 'Official Business API',
    description: 'Instant conversational qualification and autonomous scheduling directly inside the messaging app your customers use.',
    icon: MessageSquare,
    examples: 'WhatsApp Business API, Twilio, Cloud API'
  },
  {
    id: 'email',
    name: 'Corporate Email',
    protocol: 'OAuth2 / IMAP / Webhooks',
    description: 'Monitors direct inquiries, extracts context and intent, and prepares draft or autonomous follow-up cadences.',
    icon: Mail,
    examples: 'Google Workspace (Gmail), Microsoft 365 (Outlook)'
  },
  {
    id: 'calendar',
    name: 'Calendar & Scheduling',
    protocol: 'Calendar Sync Mutex',
    description: 'Verifies real-time team availability, reserves executive slots, and delivers pre-meeting dossiers to reps.',
    icon: Calendar,
    examples: 'Google Calendar, Microsoft Outlook, Cal.com'
  },
  {
    id: 'web',
    name: 'Web & Digital Forms',
    protocol: 'Encrypted Form Ingestion',
    description: 'Captures inquiries from contact forms, landing pages, and lead intake funnels in real time.',
    icon: Globe,
    examples: 'Typeform, Webflow, WordPress, Custom Webforms'
  },
  {
    id: 'spreadsheets',
    name: 'Spreadsheets & Sheets',
    protocol: 'Cloud Sheet Connectors',
    description: 'Synchronizes opportunities and contact data with existing operational spreadsheets without friction.',
    icon: FileSpreadsheet,
    examples: 'Google Sheets, Microsoft Excel, CSV pipelines'
  }
];

export const ExistingToolsSection: React.FC = () => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  return (
    <section className="py-24 md:py-36 lg:py-48 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-20 lg:mb-28 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-4">
              {tr('INTEROPERABILIDAD Y CONECTIVIDAD', 'INTEROPERABILITY & CONNECTIVITY')}
            </span>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] leading-tight">
              {tr('Funciona con las herramientas que ya utilizas.', 'Works with your existing tools.')}
            </h2>
          </div>
          <div className="max-w-md">
            <p className="text-lg md:text-xl text-[#777777] font-normal leading-relaxed">
              {tr('G-KAIS conecta los sistemas que tu negocio ya utiliza, sin migraciones disruptivas ni reemplazar tu software actual.', 'G-KAIS connects the systems your business already uses — with no disruptive migration or replacement of current software.')}
            </p>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {TOOL_CATEGORIES.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                className="p-8 border border-[#0A0A0A]/15 bg-white shadow-sm rounded-2xl flex flex-col justify-between group hover:border-[#0A0A0A]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#0A0A0A]/10">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-[#0A3F4D]" />
                      <h3 className="text-lg font-bold tracking-tight text-[#0A0A0A]">
                        {language === 'es'
                          ? tool.id === 'crm' ? 'Sistemas CRM'
                            : tool.id === 'whatsapp' ? 'WhatsApp Business'
                            : tool.id === 'email' ? 'Correo corporativo'
                            : tool.id === 'calendar' ? 'Calendario y agendamiento'
                            : tool.id === 'web' ? 'Web y formularios digitales'
                            : 'Hojas de cálculo'
                          : tool.name}
                      </h3>
                    </div>
                    <span className="font-mono-code text-[10px] text-[#777777] uppercase">
                      {tr('CONECTADO', 'CONNECTED')}
                    </span>
                  </div>

                  <p className="text-sm text-[#777777] leading-relaxed mb-6">
                    {language === 'es'
                    ? tool.id === 'crm' ? 'Creación automática de registros, avance del ciclo comercial y sincronización bidireccional.'
                      : tool.id === 'whatsapp' ? 'Calificación conversacional y agendamiento directamente dentro del canal que usan tus clientes.'
                      : tool.id === 'email' ? 'Detecta consultas, extrae contexto e intención y prepara seguimientos.'
                      : tool.id === 'calendar' ? 'Verifica disponibilidad, reserva espacios y prepara contexto antes de reuniones.'
                      : tool.id === 'web' ? 'Captura consultas desde formularios, landing pages y embudos en tiempo real.'
                      : 'Sincroniza oportunidades y contactos con hojas de cálculo operativas existentes.'
                    : tool.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#0A0A0A]/10">
                  <span className="font-mono-code text-[10px] text-[#777777] uppercase block mb-1">
                    {tr('ENTORNOS HABITUALES', 'TYPICAL ENVIRONMENTS')}
                  </span>
                  <span className="font-mono-code text-xs text-[#0A0A0A] font-medium">
                    {tool.examples}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Architecture Guarantee Note */}
        <div className="mt-12 p-6 bg-white border border-[#0A0A0A]/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono-code text-[#777777]">
          <div className="flex items-center space-x-3">
            <span className="w-2 h-2 rounded-full bg-[#0A3F4D]" />
            <span>{tr('PROTOCOLO DE INTEGRACIÓN: APIs REST, Webhooks seguros y eventos nativos', 'INTEGRATION PROTOCOL: Standard REST APIs, Secure Webhooks & Native Event Streams')}</span>
          </div>
          <span className="text-[#0A0A0A] font-semibold">{tr('SIN INTERRUMPIR LOS FLUJOS ACTUALES', 'ZERO DISRUPTION TO CURRENT WORKFLOWS')}</span>
        </div>
      </div>
    </section>
  );
};
