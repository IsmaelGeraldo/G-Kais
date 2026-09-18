import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  Terminal, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  Zap,
  Clock,
  Radio,
  Share2,
  RefreshCw
} from 'lucide-react';

export interface SystemNode {
  id: string;
  num: string;
  name: string;
  category: string;
  payload: Record<string, string>;
  route: string[];
  latency: string;
  targetPipeline: 'ANALIZAR' | 'DECIDIR' | 'ACTUAR' | 'SEGUIMIENTO';
  description: string;
  // Node coordinate percentages for responsive SVG diagram (0-100)
  x: number;
  y: number;
}

const SYSTEM_NODES: SystemNode[] = [
  {
    id: 'leads',
    num: '01',
    name: 'CLIENTES POTENCIALES',
    category: 'INBOUND STREAM',
    payload: {
      source: 'website',
      intent: 'request_quote',
      status: 'new',
      priority: 'high'
    },
    route: ['CLIENTES POTENCIALES', 'MOTOR G-KAIS', 'ANALIZAR', 'DECIDIR', 'CRM'],
    latency: '14ms',
    targetPipeline: 'ANALIZAR',
    description: 'Inbound demand arriving continuously from digital touchpoints with immediate capture.',
    x: 50,
    y: 12
  },
  {
    id: 'crm',
    num: '02',
    name: 'CRM',
    category: 'RECORD SYSTEM',
    payload: {
      contact: 'existing_lead',
      stage: 'qualified',
      last_contact: '2h ago',
      next_action: 'follow_up'
    },
    route: ['CRM', 'MOTOR G-KAIS', 'ANALIZAR', 'DECIDIR', 'SEGUIMIENTO'],
    latency: '28ms',
    targetPipeline: 'DECIDIR',
    description: 'Bidirectional sync with central pipeline of record, logging events with zero manual entry.',
    x: 16,
    y: 35
  },
  {
    id: 'email',
    num: '03',
    name: 'CORREO ELECTRÓNICO',
    category: 'COMMUNICATION',
    payload: {
      type: 'incoming_email',
      intent: 'pricing',
      sentiment: 'positive',
      priority: 'medium'
    },
    route: ['CORREO ELECTRÓNICO', 'MOTOR G-KAIS', 'ANALIZAR', 'ACTUAR', 'CRM'],
    latency: '45ms',
    targetPipeline: 'ACTUAR',
    description: 'Inbound correspondence parsed for buying intent and routed into deterministic follow-up cadences.',
    x: 84,
    y: 35
  },
  {
    id: 'whatsapp',
    num: '04',
    name: 'WHATSAPP',
    category: 'CONVERSATIONAL',
    payload: {
      type: 'new_conversation',
      intent: 'booking',
      priority: 'high'
    },
    route: ['WHATSAPP', 'MOTOR G-KAIS', 'ANALIZAR', 'DECIDIR', 'CALENDARIO'],
    latency: '8ms',
    targetPipeline: 'ANALIZAR',
    description: 'Ultra-low-latency conversational channel triggering autonomous instant qualification messaging.',
    x: 18,
    y: 78
  },
  {
    id: 'calendario',
    num: '05',
    name: 'CALENDARIO',
    category: 'SCHEDULING',
    payload: {
      event: 'booking_request',
      availability: 'available',
      action: 'schedule'
    },
    route: ['CALENDARIO', 'MOTOR G-KAIS', 'ACTUAR', 'SEGUIMIENTO', 'CRM'],
    latency: '32ms',
    targetPipeline: 'ACTUAR',
    description: 'Two-way calendar coordination verifying qualified availability before locking meetings.',
    x: 39,
    y: 88
  },
  {
    id: 'equipo',
    num: '06',
    name: 'EQUIPO',
    category: 'HUMAN ESCALATION',
    payload: {
      user: 'sales',
      task: 'follow_up',
      priority: 'high'
    },
    route: ['EQUIPO', 'MOTOR G-KAIS', 'DECIDIR', 'ACTUAR', 'SEGUIMIENTO'],
    latency: '19ms',
    targetPipeline: 'DECIDIR',
    description: 'Selective human escalation dispatching high-context briefing dossiers to executive closers.',
    x: 61,
    y: 88
  },
  {
    id: 'clientes',
    num: '07',
    name: 'CLIENTES',
    category: 'RELATIONSHIP',
    payload: {
      customer: 'existing',
      signal: 're-engagement',
      opportunity: 'renewal'
    },
    route: ['CLIENTES', 'MOTOR G-KAIS', 'ANALIZAR', 'DECIDIR', 'EQUIPO'],
    latency: '22ms',
    targetPipeline: 'SEGUIMIENTO',
    description: 'Continuous monitoring of client milestones to reactivate dormant opportunities automatically.',
    x: 82,
    y: 78
  }
];

interface PipelineStage {
  id: string;
  name: 'ANALIZAR' | 'DECIDIR' | 'ACTUAR' | 'SEGUIMIENTO';
  num: string;
  metric1: { label: string; value: string };
  metric2: { label: string; value: string };
  description: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'stage-analizar',
    name: 'ANALIZAR',
    num: '01',
    metric1: { label: 'SIGNALS PROCESSED', value: '128' },
    metric2: { label: 'AVG. LATENCY', value: '184ms' },
    description: 'Evaluates intent, timeline urgency, budget context, and qualification metrics in under 200ms.'
  },
  {
    id: 'stage-decidir',
    name: 'DECIDIR',
    num: '02',
    metric1: { label: 'HIGH PRIORITY', value: '24' },
    metric2: { label: 'DECISIONS', value: '42' },
    description: 'Deterministic rules determine immediate automated response or human team escalation.'
  },
  {
    id: 'stage-actuar',
    name: 'ACTUAR',
    num: '03',
    metric1: { label: 'ACTIONS EXECUTED', value: '67' },
    metric2: { label: 'AVG. LATENCY', value: '312ms' },
    description: 'Dispatches precision messaging, updates CRM records, and coordinates meeting slots.'
  },
  {
    id: 'stage-seguimiento',
    name: 'SEGUIMIENTO',
    num: '04',
    metric1: { label: 'FOLLOW-UPS ACTIVE', value: '17' },
    metric2: { label: 'RECOVERED', value: '4' },
    description: 'Executes persistent multi-touch cadence until the deal progresses or reaches conclusion.'
  }
];

export const HeroSystemVisual: React.FC = () => {
  // Currently active node
  const [selectedNodeId, setSelectedNodeId] = useState<string>('whatsapp');
  
  // Pipeline processing animation state: 'IDLE' | 'PROCESSING' | 'COMPLETED'
  const [systemState, setSystemState] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED'>('IDLE');
  
  // Currently highlighted pipeline stage during processing
  const [activePipelineStage, setActivePipelineStage] = useState<string | null>(null);
  
  // Dynamic live timestamp and latency fluctuation
  const [lastSignalTime, setLastSignalTime] = useState<string>('10:42:18');
  const [liveLatency, setLiveLatency] = useState<string>('184ms');

  const processingTimerRef = useRef<NodeJS.Timeout[]>([]);

  // Find active node object
  const activeNode = SYSTEM_NODES.find(n => n.id === selectedNodeId) || SYSTEM_NODES[0];

  // Handle node selection with real cascading execution
  const handleSelectNode = (node: SystemNode) => {
    setSelectedNodeId(node.id);
    
    // Clear any previous animations
    processingTimerRef.current.forEach(clearTimeout);
    processingTimerRef.current = [];

    // Trigger timestamp update
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLastSignalTime(timeStr);
    setLiveLatency(node.latency);

    // State: PROCESSING
    setSystemState('PROCESSING');
    setActivePipelineStage('ANALIZAR');

    // Cascade through the 4 pipeline stages
    const t1 = setTimeout(() => {
      setActivePipelineStage('DECIDIR');
    }, 450);

    const t2 = setTimeout(() => {
      setActivePipelineStage('ACTUAR');
    }, 900);

    const t3 = setTimeout(() => {
      setActivePipelineStage('SEGUIMIENTO');
    }, 1350);

    const t4 = setTimeout(() => {
      setSystemState('COMPLETED');
      // Return to subtle idle after completion
      const t5 = setTimeout(() => {
        setSystemState('IDLE');
        setActivePipelineStage(null);
      }, 1200);
      processingTimerRef.current.push(t5);
    }, 1800);

    processingTimerRef.current.push(t1, t2, t3, t4);
  };

  useEffect(() => {
    return () => {
      processingTimerRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="w-full border border-[#0A0A0A]/15 bg-[#F7F7F5] select-none shadow-sm overflow-hidden">
      {/* 1. TOP TELEMETRY BAR */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-[#0A0A0A]/10 text-xs font-mono-code bg-white/70">
        <div className="flex items-center space-x-3">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
              systemState === 'PROCESSING' ? 'bg-[#0A3F4D]' : 'bg-[#0A3F4D]/60'
            } opacity-75`} />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0A3F4D]" />
          </span>
          <span className="text-[#0A0A0A] font-bold tracking-wider">● SYSTEM ONLINE</span>
          <span className="text-[#0A0A0A]/20">|</span>
          <span className="text-[#777777] hidden sm:inline">MOTOR G-KAIS V2.4</span>
        </div>

        <div className="flex items-center space-x-4 text-[11px] text-[#777777]">
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-[#0A3F4D]" />
            <span>LAST SIGNAL:</span>
            <span className="text-[#0A0A0A] font-bold font-mono-code">{lastSignalTime}</span>
          </div>
          <span className="text-[#0A0A0A]/20">|</span>
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-[#0A3F4D]" />
            <span>LATENCY:</span>
            <span className="text-[#0A3F4D] font-bold">{liveLatency}</span>
          </div>
          <span className="hidden md:inline px-2 py-0.5 border border-[#0A0A0A]/10 bg-[#F7F7F5] text-[10px] font-bold text-[#0A0A0A]">
            STATE: {systemState}
          </span>
        </div>
      </div>

      {/* 2. THE ENGINE NETWORK (MOTOR G-KAIS + 7 EXTERNAL NODES) */}
      <div className="p-6 md:p-10 lg:p-12 relative bg-gradient-to-b from-white to-[#F7F7F5]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-[#0A3F4D]" />
            <span className="font-mono-code text-[11px] uppercase tracking-[0.24em] text-[#0A0A0A] font-bold">
              SIGNAL PIPELINE ARCHITECTURE
            </span>
          </div>
          <span className="font-mono-code text-[10px] text-[#777777] hidden sm:inline">
            CLICK ANY NODE TO EMIT SIGNAL // INTERACTIVE LIVE TOPOLOGY
          </span>
        </div>

        {/* Network Diagram Viewport */}
        <div className="relative w-full min-h-[380px] sm:min-h-[440px] md:min-h-[480px] border border-[#0A0A0A]/10 bg-[#FAFAFA] overflow-hidden flex items-center justify-center p-4">
          {/* Subtle Grid Background */}
          <div 
            className="absolute inset-0 opacity-[0.035] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#0A0A0A 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* SVG Vector Connection Lines Between Center (50%, 50%) and the 7 Nodes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {SYSTEM_NODES.map((node) => {
              const isSelected = selectedNodeId === node.id;
              // Center coordinates are (50%, 50%)
              return (
                <g key={`connector-${node.id}`}>
                  {/* Base fine connection line */}
                  <line
                    x1={`${node.x}%`}
                    y1={`${node.y}%`}
                    x2="50%"
                    y2="50%"
                    stroke={isSelected ? '#0A3F4D' : '#0A0A0A'}
                    strokeWidth={isSelected ? '2' : '1'}
                    strokeOpacity={isSelected ? 0.9 : 0.15}
                    strokeDasharray={isSelected ? 'none' : '3 4'}
                  />

                  {/* Active animated transmission packet */}
                  {isSelected && (
                    <circle
                      r="4"
                      fill="#0A3F4D"
                      className="transition-all"
                    >
                      <animateMotion
                        dur={systemState === 'PROCESSING' ? '0.8s' : '2s'}
                        repeatCount="indefinite"
                        path={`M ${node.x * 10} ${node.y * 10} L 500 500`}
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Central Core: MOTOR G-KAIS */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className={`p-4 sm:p-5 border transition-all duration-300 bg-white text-center shadow-sm ${
              systemState === 'PROCESSING' 
                ? 'border-[#0A3F4D] shadow-md ring-2 ring-[#0A3F4D]/20' 
                : 'border-[#0A0A0A] hover:border-[#0A3F4D]'
            }`}>
              <div className="flex items-center justify-center space-x-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${
                  systemState === 'PROCESSING' ? 'bg-[#0A3F4D] animate-ping' : 'bg-[#0A0A0A]'
                }`} />
                <span className="font-mono-code text-[10px] text-[#0A3F4D] uppercase tracking-widest font-semibold">
                  CENTRAL CORE
                </span>
              </div>
              <div className="text-sm sm:text-base md:text-lg font-black tracking-tight text-[#0A0A0A] whitespace-nowrap">
                MOTOR G-KAIS
              </div>
              <div className="font-mono-code text-[9px] text-[#777777] uppercase tracking-wider mt-0.5">
                AUTONOMOUS ORCHESTRATOR
              </div>
            </div>
          </div>

          {/* 7 External Nodes positioned around the center */}
          {SYSTEM_NODES.map((node) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <button
                key={node.id}
                onClick={() => handleSelectNode(node)}
                id={`hero-node-${node.id}`}
                aria-pressed={isSelected}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`absolute z-20 group text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0A3F4D] px-2.5 sm:px-3 py-2 sm:py-2.5 border ${
                  isSelected
                    ? 'border-[#0A3F4D] bg-[#0A3F4D] text-[#F7F7F5] shadow-md'
                    : 'border-[#0A0A0A]/20 bg-white/95 text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`font-mono-code text-[9px] font-bold ${
                    isSelected ? 'text-white/80' : 'text-[#777777]'
                  }`}>
                    {node.num}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-[#0A0A0A]/40 group-hover:bg-[#0A3F4D]'
                  }`} />
                  <span className="text-[10px] sm:text-xs font-bold tracking-tight whitespace-nowrap">
                    {node.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 3. TECHNICAL CONSOLE: INCOMING PAYLOAD & ROUTE */}
        <div className="mt-6 border border-[#0A0A0A]/15 bg-white shadow-sm overflow-hidden">
          {/* Console Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 border-b border-[#0A0A0A]/10 bg-[#F7F7F5] text-xs font-mono-code">
            <div className="flex items-center space-x-2 text-[#0A0A0A]">
              <Terminal className="w-3.5 h-3.5 text-[#0A3F4D]" />
              <span className="font-bold tracking-wider">SYSTEM INSPECTOR // LIVE TELEMETRY CONSOLE</span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-[#777777]">
              <span>SOURCE:</span>
              <span className="font-bold text-[#0A3F4D]">{activeNode.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#0A0A0A]/10">
            {/* Left Box: Incoming Signal (JSON Payload) */}
            <div className="lg:col-span-6 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#777777] font-semibold">
                  INCOMING SIGNAL // RAW PAYLOAD
                </span>
                <span className="font-mono-code text-[9px] text-[#0A3F4D] font-bold">
                  ENCRYPTED TLS // {activeNode.latency}
                </span>
              </div>

              <div className="p-3 bg-[#0A0A0A] text-[#F7F7F5] font-mono-code text-xs rounded-none overflow-x-auto">
                <pre className="text-white/90 leading-relaxed text-[11px] sm:text-xs">
{JSON.stringify(activeNode.payload, null, 2)}
                </pre>
              </div>

              <p className="mt-3 text-xs text-[#777777] leading-relaxed">
                {activeNode.description}
              </p>
            </div>

            {/* Right Box: Transmission Route */}
            <div className="lg:col-span-6 p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#777777] font-semibold">
                    TRANSMISSION ROUTE // EXECUTION FLOW
                  </span>
                  <span className={`font-mono-code text-[9px] px-2 py-0.5 border ${
                    systemState === 'PROCESSING'
                      ? 'border-[#0A3F4D] text-[#0A3F4D] bg-[#0A3F4D]/5'
                      : 'border-[#0A0A0A]/10 text-[#777777]'
                  }`}>
                    {systemState === 'PROCESSING' ? 'ACTIVE PROPAGATION' : 'FLOW READY'}
                  </span>
                </div>

                {/* Horizontal / Wrapped Route Flow Breadcrumb */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2">
                  {activeNode.route.map((step, idx) => {
                    const isLast = idx === activeNode.route.length - 1;
                    const isCore = step === 'MOTOR G-KAIS';
                    const isCurrent = activePipelineStage === step;

                    return (
                      <React.Fragment key={step}>
                        <div className={`px-2.5 py-1.5 font-mono-code text-[10px] sm:text-[11px] font-bold border transition-all duration-150 ${
                          isCurrent
                            ? 'border-[#0A3F4D] bg-[#0A3F4D] text-[#F7F7F5] scale-105 shadow-sm'
                            : isCore
                            ? 'border-[#0A0A0A] bg-[#0A0A0A] text-[#F7F7F5]'
                            : 'border-[#0A0A0A]/20 bg-[#F7F7F5] text-[#0A0A0A]'
                        }`}>
                          {step}
                        </div>
                        {!isLast && (
                          <ArrowRight className="w-3.5 h-3.5 text-[#0A3F4D] shrink-0" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Status footer for console */}
              <div className="mt-6 pt-3 border-t border-[#0A0A0A]/10 flex items-center justify-between text-[10px] font-mono-code text-[#777777]">
                <span>PROPAGATION: DETERMINISTIC</span>
                <span className="text-[#0A3F4D] font-bold">HUMAN-IN-THE-LOOP SAFEGUARDED</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. PIPELINE G-KAIS (ANALIZAR → DECIDIR → ACTUAR → SEGUIMIENTO) */}
        <div className="mt-8 pt-8 border-t border-[#0A0A0A]/15">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#0A3F4D]" />
              <span className="font-mono-code text-[11px] uppercase tracking-[0.24em] text-[#0A0A0A] font-bold">
                PIPELINE G-KAIS // CORE STAGES
              </span>
            </div>
            <span className="font-mono-code text-[10px] text-[#777777]">
              CASCADE: ANALIZAR → DECIDIR → ACTUAR → SEGUIMIENTO
            </span>
          </div>

          {/* 4 Connected Stages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {PIPELINE_STAGES.map((stage) => {
              const isStageActive = activePipelineStage === stage.name;

              return (
                <div
                  key={stage.id}
                  id={`pipeline-stage-${stage.name.toLowerCase()}`}
                  className={`p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between ${
                    isStageActive
                      ? 'border-[#0A3F4D] bg-white shadow-md ring-2 ring-[#0A3F4D]/15'
                      : 'border-[#0A0A0A]/15 bg-white/70 hover:border-[#0A0A0A]/40'
                  }`}
                >
                  <div>
                    {/* Stage Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0A]/10 mb-4">
                      <div className="flex items-baseline space-x-2">
                        <span className="font-mono-code text-[11px] text-[#777777]">
                          {stage.num} //
                        </span>
                        <h4 className="font-extrabold text-sm sm:text-base tracking-tight text-[#0A0A0A]">
                          {stage.name}
                        </h4>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${
                        isStageActive ? 'bg-[#0A3F4D] animate-pulse' : 'bg-[#0A0A0A]/20'
                      }`} />
                    </div>

                    <p className="text-xs text-[#777777] leading-relaxed mb-6">
                      {stage.description}
                    </p>
                  </div>

                  {/* Stage Metrics */}
                  <div className="pt-3 border-t border-[#0A0A0A]/10 grid grid-cols-2 gap-2 font-mono-code">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#777777] block">
                        {stage.metric1.label}
                      </span>
                      <span className="text-sm font-bold text-[#0A0A0A] block">
                        {stage.metric1.value}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#777777] block">
                        {stage.metric2.label}
                      </span>
                      <span className="text-sm font-bold text-[#0A3F4D] block">
                        {stage.metric2.value}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
