import React, { useState } from 'react';
import { ArrowRight, ArrowDown, CheckCircle2, ChevronRight } from 'lucide-react';

interface StageItem {
  id: string;
  num: string;
  label: string;
  type: 'inbound' | 'engine' | 'sync' | 'outcome';
  explanation: string;
  technicalSub: string;
  specItems: { key: string; value: string }[];
}

const STAGES: StageItem[] = [
  {
    id: 'lead',
    num: '01',
    label: 'LEAD',
    type: 'inbound',
    explanation: 'Inbound demand initiates across webforms, direct email, WhatsApp, and partner channels.',
    technicalSub: 'Omnichannel Ingestion',
    specItems: [
      { key: 'Channels', value: 'Configured per business and integration' },
      { key: 'Input', value: 'Forms, messages and structured lead data' },
      { key: 'Control', value: 'Validation, routing and human oversight' }
    ]
  },
  {
    id: 'capture',
    num: '02',
    label: 'CAPTURE',
    type: 'engine',
    explanation: 'Collect opportunities from the channels your business already uses.',
    technicalSub: 'Real-Time Ingestion Pipeline',
    specItems: [
      { key: 'Capture', value: 'Immediate intake when a connected source sends data' },
      { key: 'Protection', value: 'Validation and anti-abuse controls by channel' },
      { key: 'Data handling', value: 'Protected access and controlled permissions' }
    ]
  },
  {
    id: 'ai-analysis',
    num: '03',
    label: 'AI ANALYSIS',
    type: 'engine',
    explanation: 'Understand intent, urgency and context before deciding what happens next.',
    technicalSub: 'Intent & Qualification Parsing',
    specItems: [
      { key: 'Analysis', value: 'Intent, urgency and commercial context' },
      { key: 'Context', value: 'Needs, timing and relevant lead details' },
      { key: 'Decision support', value: 'AI-assisted signals with human review where needed' }
    ]
  },
  {
    id: 'priority',
    num: '04',
    label: 'PRIORITY',
    type: 'engine',
    explanation: 'Identify which opportunities require immediate attention.',
    technicalSub: 'Algorithmic Escalation',
    specItems: [
      { key: 'Routing', value: 'Priority rules based on business criteria' },
      { key: 'Timing', value: 'Due today, overdue and upcoming follow-up logic' },
      { key: 'Alerts', value: 'Operational alerts and configured notification channels' }
    ]
  },
  {
    id: 'crm',
    num: '05',
    label: 'CRM',
    type: 'sync',
    explanation: 'Keep lead context, ownership, next actions and commercial status in one operational record.',
    technicalSub: 'Bidirectional Data Sync',
    specItems: [
      { key: 'CRM', value: 'G-KAIS workspace or external integration by project' },
      { key: 'Operations', value: 'Status, owner, next action and follow-up tracking' },
      { key: 'History', value: 'Activity timeline for operational changes and task results' }
    ]
  },
  {
    id: 'response',
    num: '06',
    label: 'RESPONSE',
    type: 'engine',
    explanation: 'Support fast, consistent responses using approved templates or AI assistance when configured.',
    technicalSub: 'Brand-Governed Autonomous Dispatch',
    specItems: [
      { key: 'Response', value: 'Templates or AI-assisted responses when configured' },
      { key: 'Knowledge', value: 'Business-approved information and operating rules' },
      { key: 'Control', value: 'Human approval can remain in the loop' }
    ]
  },
  {
    id: 'follow-up',
    num: '07',
    label: 'FOLLOW-UP',
    type: 'engine',
    explanation: 'Keep conversations moving when prospects are not ready to book.',
    technicalSub: 'Autonomous Multi-Touch Cadence',
    specItems: [
      { key: 'Cadence', value: 'Task engine, reminders and configurable intervals' },
      { key: 'Next action', value: 'Call, WhatsApp, email, proposal, meeting or follow-up' },
      { key: 'Outcome', value: 'Clear result and next step instead of forgotten leads' }
    ]
  },
  {
    id: 'booked',
    num: '08',
    label: 'BOOKED',
    type: 'outcome',
    explanation: 'Turn managed opportunities into measurable outcomes.',
    technicalSub: 'Meeting & Revenue Confirmation',
    specItems: [
      { key: 'Outcome', value: 'Meeting, proposal, client, lost or another defined result' },
      { key: 'Handoff', value: 'Context available before the next human action' },
      { key: 'Measurement', value: 'Track task completion and commercial outcomes' }
    ]
  }
];

export const TheSystemSection: React.FC = () => {
  const [selectedStageId, setSelectedStageId] = useState<string>('ai-analysis');

  const selectedStage = STAGES.find(s => s.id === selectedStageId) || STAGES[2];
  const selectedIndex = STAGES.findIndex(s => s.id === selectedStageId);

  return (
    <section id="the-system" className="py-24 md:py-36 lg:py-48 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-20 lg:mb-28 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-4">
              THE SYSTEM
            </span>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] leading-tight">
              One system. Every opportunity.
            </h2>
          </div>
          <p className="text-lg md:text-xl text-[#777777] max-w-md font-normal leading-relaxed">
            G-KAIS connects the fragmented parts of your commercial process into one intelligent workflow.
          </p>
        </div>

        {/* The Master Interactive Diagram Container */}
        <div className="border border-[#0A0A0A]/15 bg-white p-6 sm:p-8 lg:p-12 shadow-sm">
          {/* Top Stage Tracker Bar */}
          <div className="flex flex-wrap items-center justify-between pb-6 mb-8 border-b border-[#0A0A0A]/10 text-xs font-mono-code text-[#777777]">
            <div className="flex items-center space-x-3">
              <span className="w-2 h-2 rounded-full bg-[#0A3F4D]" />
              <span className="text-[#0A0A0A] font-bold tracking-wider">
                COMMERCIAL WORKFLOW GRAPH
              </span>
              <span className="text-[#0A0A0A]/30 hidden sm:inline">|</span>
              <span className="hidden sm:inline">8 STAGE EXAMPLE WORKFLOW</span>
            </div>
            <div className="text-[11px] text-[#0A3F4D] font-medium">
              ACTIVE STAGE: {selectedStage.num} // {selectedStage.label}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left / Center: Interactive 8-Stage Sequential Flow */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="text-[11px] font-mono-code tracking-widest text-[#777777] uppercase mb-4">
                Click any stage to inspect logic & connections
              </div>

              <div className="flex flex-col space-y-2">
                {STAGES.map((stage, idx) => {
                  const isSelected = stage.id === selectedStageId;
                  const isPreceding = idx < selectedIndex;

                  return (
                    <React.Fragment key={stage.id}>
                      <button
                        onClick={() => setSelectedStageId(stage.id)}
                        id={`system-stage-btn-${stage.id}`}
                        className={`text-left p-4 sm:p-5 border transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                          isSelected
                            ? 'border-[#0A0A0A] bg-[#0A0A0A] text-[#F7F7F5] shadow-sm'
                            : isPreceding
                            ? 'border-[#0A0A0A]/20 bg-[#F7F7F5]/50 text-[#0A0A0A] hover:border-[#0A0A0A]/40'
                            : 'border-[#0A0A0A]/10 bg-white text-[#0A0A0A] hover:border-[#0A0A0A]/30'
                        }`}
                      >
                        <div className="flex items-baseline space-x-4 sm:space-x-6">
                          <span className={`font-mono-code text-xs font-semibold ${
                            isSelected ? 'text-[#F7F7F5]/60' : 'text-[#777777]'
                          }`}>
                            {stage.num}
                          </span>

                          <div>
                            <h4 className="font-extrabold tracking-tight text-base sm:text-lg">
                              {stage.label}
                            </h4>
                            <p className={`text-xs mt-0.5 ${
                              isSelected ? 'text-[#F7F7F5]/80' : 'text-[#777777]'
                            }`}>
                              {stage.technicalSub}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className={`font-mono-code text-[10px] uppercase tracking-wider px-2 py-0.5 border ${
                            isSelected
                              ? 'border-white/20 text-white/90'
                              : 'border-[#0A0A0A]/10 text-[#0A3F4D]'
                          }`}>
                            {stage.type}
                          </span>

                          <div className={`w-2 h-2 rounded-full transition-colors ${
                            isSelected ? 'bg-[#F7F7F5]' : 'bg-[#0A0A0A]/15 group-hover:bg-[#0A3F4D]'
                          }`} />
                        </div>
                      </button>

                      {idx < STAGES.length - 1 && (
                        <div className="flex items-center justify-center py-0.5">
                          <div className="flex flex-col items-center">
                            <div className={`h-2.5 w-[1px] ${
                              idx < selectedIndex ? 'bg-[#0A3F4D]' : 'bg-[#0A0A0A]/15'
                            }`} />
                            <ArrowDown className={`w-3 h-3 ${
                              idx < selectedIndex ? 'text-[#0A3F4D]' : 'text-[#0A0A0A]/30'
                            }`} />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Right: Explanations & Technical Architecture Panel */}
            <div className="lg:col-span-5 lg:sticky lg:top-32">
              <div className="border border-[#0A0A0A]/15 bg-[#F7F7F5] p-6 sm:p-8">
                {/* Active Indicator Top */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#0A0A0A]/10">
                  <span className="font-mono-code text-[11px] uppercase tracking-widest text-[#0A3F4D] font-bold">
                    STAGE // {selectedStage.num}
                  </span>
                  <span className="font-mono-code text-[10px] text-[#777777] uppercase">
                    TYPE: {selectedStage.type}
                  </span>
                </div>

                {/* Stage Title */}
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A0A0A] mb-3">
                  {selectedStage.label}
                </h3>

                <p className="font-mono-code text-xs text-[#0A3F4D] font-semibold tracking-wider uppercase mb-6">
                  {selectedStage.technicalSub}
                </p>

                {/* High-Level Editorial Explanation */}
                <div className="p-4 bg-white border border-[#0A0A0A]/10 mb-8">
                  <p className="text-base sm:text-lg font-medium tracking-tight text-[#0A0A0A] leading-snug">
                    "{selectedStage.explanation}"
                  </p>
                </div>

                {/* Operational Telemetry Specifications */}
                <div>
                  <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#777777] block mb-3">
                    STAGE SPECIFICATIONS
                  </span>
                  <div className="space-y-3 font-mono-code text-xs">
                    {selectedStage.specItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between pb-2 border-b border-[#0A0A0A]/5">
                        <span className="text-[#777777]">{item.key}</span>
                        <span className="text-[#0A0A0A] font-medium text-right">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Flow Sequence Breadcrumbs */}
                <div className="mt-8 pt-6 border-t border-[#0A0A0A]/10">
                  <span className="font-mono-code text-[10px] text-[#777777] uppercase block mb-2">
                    SEQUENTIAL CONTEXT
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono-code">
                    <span className="text-[#777777]">
                      {selectedIndex > 0 ? `← ${STAGES[selectedIndex - 1].label}` : 'START'}
                    </span>
                    <span className="text-[#0A3F4D] font-bold">
                      [{selectedStage.label}]
                    </span>
                    <span className="text-[#777777]">
                      {selectedIndex < STAGES.length - 1 ? `${STAGES[selectedIndex + 1].label} →` : 'COMPLETE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
