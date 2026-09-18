import React, { useState } from 'react';
import { ArrowDown, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

interface SystemNode {
  id: string;
  name: string;
  code: string;
  sub: string;
  description: string;
  latency: string;
  protocol: string;
  specs: { label: string; val: string }[];
}

const NODES: SystemNode[] = [
  {
    id: 'lead',
    name: 'LEAD',
    code: 'INBOUND_01',
    sub: 'Omnichannel Capture',
    description: 'Intercepts inquiries across Web forms, Direct Email, WhatsApp, and API calls instantaneously.',
    latency: '12ms',
    protocol: 'G-HOOK / SECURE_STREAM',
    specs: [
      { label: 'Data format', val: 'Unstructured text & metadata' },
      { label: 'Validation', val: 'SPF / DKIM / Anti-spam verified' },
      { label: 'Ingestion loss', val: '0.00%' }
    ]
  },
  {
    id: 'analyze',
    name: 'ANALYZE',
    code: 'EVAL_02',
    sub: 'ICP & Intent Scoring',
    description: 'Evaluates budget qualification, urgency, company size, and sentiment before any human touches the lead.',
    latency: '84ms',
    protocol: 'NEURAL_CLASSIFIER_V4',
    specs: [
      { label: 'Intent confidence', val: '98.4%' },
      { label: 'ICP matrix match', val: 'Tier-1 Enterprise' },
      { label: 'Decision cycle', val: '< 100ms' }
    ]
  },
  {
    id: 'respond',
    name: 'RESPOND',
    code: 'DISPATCH_03',
    sub: 'Immediate Precision Response',
    description: 'Generates context-rich, branded, custom technical answers based on internal documentation and pricing rules.',
    latency: '42s',
    protocol: 'SYNTH_ENGINE_PRO',
    specs: [
      { label: 'Response speed', val: 'Within 60 seconds' },
      { label: 'Accuracy check', val: 'Grounding verified' },
      { label: 'Tone alignment', val: 'Executive B2B' }
    ]
  },
  {
    id: 'follow-up',
    name: 'FOLLOW UP',
    code: 'CADENCE_04',
    sub: 'Autonomous Persistent Cadence',
    description: 'Monitors reply silence and dispatches multi-touch value-add follow-ups until meeting booked or explicitly closed.',
    latency: 'Persistent',
    protocol: 'PERSIST_FLOW_CRON',
    specs: [
      { label: 'Cadence schedule', val: '+24h, +72h, +7d, +14d' },
      { label: 'Drop-off recovery', val: '+38% avg.' },
      { label: 'Ghosting detection', val: 'Active real-time' }
    ]
  },
  {
    id: 'book',
    name: 'BOOK',
    code: 'SYNC_05',
    sub: 'Calendar & CRM Commitment',
    description: 'Locks executive calendar slots, syncs complete conversation telemetry to CRM, and alerts human deal owners.',
    latency: '0.8s',
    protocol: 'CAL_SYNC_MUTEX',
    specs: [
      { label: 'CRM pipeline update', val: 'Stage: Qualified Meeting' },
      { label: 'Human intervention', val: 'Only on deal closing' },
      { label: 'System status', val: 'Loop Closed' }
    ]
  }
];

export const SystemDiagram: React.FC = () => {
  const [activeNodeId, setActiveNodeId] = useState<string>('analyze');
  const activeNode = NODES.find(n => n.id === activeNodeId) || NODES[1];

  return (
    <div className="w-full border border-[#0A0A0A]/15 bg-[#F7F7F5] p-6 lg:p-10 select-none">
      {/* Top telemetry bar */}
      <div className="flex flex-wrap items-center justify-between pb-6 mb-8 border-b border-[#0A0A0A]/10 text-xs font-mono-code text-[#777777]">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-[#0A3F4D]" />
          <span className="text-[#0A0A0A] font-semibold tracking-wider">SYSTEM OS // KERNEL v4.12</span>
          <span className="text-[#777777]/50">|</span>
          <span className="hidden sm:inline">STATE: DETERMINISTIC</span>
        </div>
        <div className="flex items-center space-x-6 mt-2 sm:mt-0">
          <span>PIPELINE: ACTIVE</span>
          <span>CYCLE: 100% AUDITED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Connected Vertical/Horizontal Node Progression */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="text-[11px] font-mono-code tracking-widest text-[#777777] uppercase mb-1">
            System Topology — Sequential Pipeline
          </div>

          {NODES.map((node, index) => {
            const isSelected = activeNodeId === node.id;
            return (
              <React.Fragment key={node.id}>
                <div
                  onClick={() => setActiveNodeId(node.id)}
                  id={`system-node-${node.id}`}
                  className={`cursor-pointer transition-all duration-150 p-4 border ${
                    isSelected
                      ? 'border-[#0A0A0A] bg-[#0A0A0A] text-[#F7F7F5]'
                      : 'border-[#0A0A0A]/15 bg-white/70 hover:border-[#0A0A0A]/40 text-[#0A0A0A]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline space-x-3">
                      <span className={`font-mono-code text-xs ${isSelected ? 'text-[#F7F7F5]/60' : 'text-[#777777]'}`}>
                        0{index + 1}
                      </span>
                      <h4 className="font-extrabold tracking-tight text-base sm:text-lg">
                        {node.name}
                      </h4>
                      <span className={`text-xs font-medium hidden sm:inline ${isSelected ? 'text-[#F7F7F5]/70' : 'text-[#777777]'}`}>
                        — {node.sub}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`text-[11px] font-mono-code ${isSelected ? 'text-[#F7F7F5]/80' : 'text-[#0A3F4D] font-medium'}`}>
                        {node.latency}
                      </span>
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#0A0A0A]/20'}`} />
                    </div>
                  </div>
                </div>

                {index < NODES.length - 1 && (
                  <div className="flex items-center justify-center py-0.5">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-[1px] bg-[#0A0A0A]/20" />
                      <ArrowDown className="w-3.5 h-3.5 text-[#0A0A0A]/40" />
                      <div className="h-1 w-[1px] bg-[#0A0A0A]/20" />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Operating System Telemetry Inspector for selected node */}
        <div className="lg:col-span-5 border border-[#0A0A0A]/15 bg-white/50 p-6 flex flex-col justify-between self-stretch">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0A]/10 mb-4">
              <span className="font-mono-code text-[11px] uppercase tracking-widest text-[#777777]">
                Node Inspector
              </span>
              <span className="font-mono-code text-[11px] font-medium text-[#0A3F4D]">
                {activeNode.code}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#777777] block">
                  Subsystem
                </span>
                <p className="text-xl font-bold tracking-tight text-[#0A0A0A] mt-0.5">
                  {activeNode.name}
                </p>
                <p className="text-sm font-medium text-[#0A3F4D] mt-0.5">
                  {activeNode.sub}
                </p>
              </div>

              <p className="text-sm text-[#0A0A0A]/80 leading-relaxed pt-2 border-t border-[#0A0A0A]/10">
                {activeNode.description}
              </p>

              <div className="pt-3 space-y-2.5">
                <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#777777] block">
                  System Specifications
                </span>
                {activeNode.specs.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#0A0A0A]/5">
                    <span className="text-[#777777]">{s.label}</span>
                    <span className="font-mono-code font-medium text-[#0A0A0A]">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#0A0A0A]/10 flex items-center justify-between text-[11px] font-mono-code text-[#777777]">
            <span className="flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0A3F4D] mr-1.5" />
              Human-in-the-loop fallback
            </span>
            <span className="text-[#0A0A0A] font-semibold">100% DETERMINISTIC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
