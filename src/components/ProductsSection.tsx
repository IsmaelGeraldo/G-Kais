import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { ArrowUpRight, ChevronDown } from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  metrics: string;
  architecture: string[];
}

const PRODUCTS: ProductItem[] = [
  {
    id: 'leadflow',
    name: 'LeadFlow',
    category: 'Lead Recovery',
    tagline: 'Autonomous Lead Recovery System',
    description: 'Captures unanswered inquiries across all channels, qualifies prospect intent, and executes persistent multi-touch follow-ups until opportunities convert.',
    metrics: 'Target: +38% recovery*',
    architecture: ['Omnichannel Ingestion', 'Intent Classification', 'Autonomous Cadence', 'CRM Sync']
  },
  {
    id: 'bookingflow',
    name: 'BookingFlow',
    category: 'Booking Automation',
    tagline: 'Autonomous Scheduling & Qualification Agent',
    description: 'Coordinates executive meeting times across timezones, verifies buyer qualification before calendar access, and delivers pre-meeting dossiers to your team.',
    metrics: 'Target: High attendance*',
    architecture: ['Calendar Mutex', 'Timezone Resolver', 'Pre-Meeting Briefs', 'SMS/Email Loops']
  },
  {
    id: 'supportflow',
    name: 'SupportFlow',
    category: 'Customer Support',
    tagline: 'Tier-1 Autonomous Resolution & Escalation',
    description: 'Resolves repetitive technical and operational inquiries instantly against your company documentation, escalating complex exceptions to human specialists.',
    metrics: 'Target: 60%+ resolution*',
    architecture: ['Grounding Engine', 'SLA Sentinel', 'Human Handover', 'Audit Trail']
  },
  {
    id: 'quoteflow',
    name: 'QuoteFlow',
    category: 'Quote Automation',
    tagline: 'Rapid RFP & Proposal Generation Engine',
    description: 'Ingests complex client requirements, calculates pricing models within strict margin limits, and drafts executive-ready B2B proposals in minutes.',
    metrics: 'Target: Rapid proposals*',
    architecture: ['Margin Safeguards', 'Dynamic Pricing', 'PDF Assembly', 'Approval Gateways']
  },
  {
    id: 'reviewflow',
    name: 'ReviewFlow',
    category: 'Review Management',
    tagline: 'Post-Delivery Reputation & Sentiment System',
    description: 'Monitors client satisfaction milestones, requests feedback at moments of delight, and turns positive outcomes into verified public client reviews.',
    metrics: 'Target: Feedback loops*',
    architecture: ['Sentiment Pulse', 'Milestone Trigger', 'Friction Alerts', 'Review Attribution']
  }
];

export const ProductsSection: React.FC = () => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  const [expandedId, setExpandedId] = useState<string | null>('leadflow');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section id="about" className="py-24 md:py-36 lg:py-48 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-20 lg:mb-28 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-4">
              {tr('ECOSISTEMA DE PRODUCTOS', 'PRODUCT ECOSYSTEM')}
            </span>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] leading-tight">
              {tr('Una arquitectura. Múltiples sistemas.', 'One architecture. Multiple systems.')}
            </h2>
          </div>
          <p className="text-lg md:text-xl text-[#777777] max-w-md font-normal leading-relaxed">
            {tr('Sistemas empresariales modulares construidos sobre una base operativa común, desplegables de forma independiente o como una suite unificada.', 'Modular business systems built on a shared operational backbone, designed to deploy independently or as a unified suite.')}
          </p>
        </div>

        {/* Editorial Modular List */}
        <div className="border-t border-b border-[#0A0A0A]/15 divide-y divide-[#0A0A0A]/15">
          {PRODUCTS.map((prod, index) => {
            const isExpanded = expandedId === prod.id;

            return (
              <div
                key={prod.id}
                onClick={() => toggleExpand(prod.id)}
                id={`product-item-${prod.id}`}
                className={`cursor-pointer transition-colors duration-200 ${
                  isExpanded ? 'bg-white py-10 lg:py-12 px-4 sm:px-8' : 'py-8 lg:py-10 px-2 sm:px-6 hover:bg-white/50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left Column: Number, Name & Category */}
                  <div className="lg:w-5/12 flex items-baseline space-x-6 sm:space-x-10">
                    <span className="font-mono-code text-xs font-semibold text-[#777777]">
                      0{index + 1}
                    </span>
                    <div>
                      <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0A0A0A]">
                        {prod.name}
                      </h3>
                      <span className="font-mono-code text-xs text-[#0A3F4D] tracking-wider uppercase mt-1.5 block font-semibold">
                        {language === 'es'
                          ? prod.id === 'leadflow' ? 'Recuperación de leads'
                            : prod.id === 'bookingflow' ? 'Automatización de reservas'
                            : prod.id === 'supportflow' ? 'Soporte al cliente'
                            : prod.id === 'quoteflow' ? 'Automatización de cotizaciones'
                            : 'Gestión de reseñas'
                          : prod.category}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Description & Sub-Architecture */}
                  <div className="lg:w-5/12">
                    <p className={`text-sm sm:text-base text-[#0A0A0A]/90 leading-relaxed mb-4 ${
                      isExpanded ? 'opacity-100' : 'opacity-70 line-clamp-2'
                    }`}>
                      {language === 'es'
                      ? prod.id === 'leadflow' ? 'Captura consultas no atendidas, califica intención y ejecuta seguimientos persistentes hasta que la oportunidad avance.'
                        : prod.id === 'bookingflow' ? 'Coordina horarios, califica antes de reservar y entrega contexto previo a tu equipo.'
                        : prod.id === 'supportflow' ? 'Resuelve consultas repetitivas y escala excepciones complejas a personas.'
                        : prod.id === 'quoteflow' ? 'Procesa requerimientos, calcula precios dentro de límites definidos y prepara propuestas.'
                        : 'Monitorea satisfacción, solicita feedback en el momento adecuado y ayuda a convertir resultados positivos en reseñas.'
                      : prod.description}
                    </p>

                    {isExpanded && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {prod.architecture.map((tech, i) => (
                          <span
                            key={i}
                            className="font-mono-code text-[10px] uppercase tracking-wider px-2.5 py-1 bg-[#F7F7F5] border border-[#0A0A0A]/10 text-[#0A0A0A]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Metric & Action Indicator */}
                  <div className="lg:w-2/12 flex items-center lg:justify-end space-x-4">
                    <span className="font-mono-code text-xs text-[#0A3F4D] font-bold">
                      {prod.metrics}
                    </span>
                    <div className={`w-8 h-8 rounded-full border border-[#0A0A0A]/15 flex items-center justify-center transition-transform duration-200 ${
                      isExpanded ? 'rotate-90 bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'text-[#0A0A0A]'
                    }`}>
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-right">
          <span className="font-mono-code text-[10px] text-[#777777]">
            {tr('*Métricas objetivo ilustrativas basadas en simulaciones. Los resultados reales varían según industria y volumen.', '*Illustrative target metrics based on automated system simulations. Individual outcomes vary by industry and volume.')}
          </span>
        </div>
      </div>
    </section>
  );
};
