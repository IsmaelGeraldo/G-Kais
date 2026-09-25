import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const snapToRenderPixel = (value: number) => Math.round(value * 2) / 2;
const accent = '#0A3F4D';
const border = '#D8D8D8';
const softBorder = '#E7E7E7';
const muted = '#5F5F5F';

const Label: React.FC<React.PropsWithChildren<{teal?: boolean}>> = ({children, teal = false}) => (
  <div style={{fontFamily:'Arial, Helvetica, sans-serif',fontSize:10,fontWeight:700,letterSpacing:1.35,textTransform:'uppercase',color:teal?accent:'#555555'}}>{children}</div>
);

const Pill: React.FC<React.PropsWithChildren<{tone?:'teal'|'amber'|'neutral'}>> = ({children,tone='neutral'}) => {
  const s = tone==='teal'
    ? {border:'rgba(10,63,77,0.26)',background:'#F4F8F8',color:accent}
    : tone==='amber'
      ? {border:'#E7D3A2',background:'#FFF9EC',color:'#8A6215'}
      : {border:softBorder,background:'#FFFFFF',color:'#565656'};
  return <span style={{display:'inline-flex',alignItems:'center',border:`1px solid ${s.border}`,background:s.background,color:s.color,borderRadius:999,padding:'5px 9px',fontFamily:'Arial, Helvetica, sans-serif',fontSize:9,fontWeight:700,letterSpacing:.45}}>{children}</span>;
};

const MiniField: React.FC<{label:string;value:string;interactive?:boolean;changed?:boolean}> = ({label,value,interactive=false,changed=false}) => (
  <div style={{border:`1px solid ${changed?'rgba(10,63,77,0.34)':softBorder}`,borderRadius:12,background:changed?'linear-gradient(180deg,#F8FBFA 0%,#F1F7F6 100%)':'#FFFFFF',padding:'10px 11px',minHeight:54,boxSizing:'border-box',boxShadow:changed?'0 5px 14px rgba(20,34,31,0.06)':'none'}}>
    <div style={{fontFamily:'Arial, Helvetica, sans-serif',fontSize:9,fontWeight:600,color:'#606060'}}>{label}</div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,fontFamily:'Arial, Helvetica, sans-serif',fontSize:12,fontWeight:700,color:changed?accent:'#151515',marginTop:5,lineHeight:1.25}}>
      <span>{value}</span>{interactive?<span style={{fontSize:10,color:accent}}>⌄</span>:null}
    </div>
  </div>
);

const LeadRow: React.FC<{name:string;company:string;status:string;selected:boolean}> = ({name,company,status,selected}) => (
  <div style={{position:'relative',minHeight:78,border:selected?'1px solid rgba(10,63,77,0.34)':`1px solid ${softBorder}`,background:selected?'#F4F8F8':'#FFFFFF',borderRadius:14,padding:'11px 12px',boxSizing:'border-box',boxShadow:selected?'0 0 18px rgba(10,63,77,0.10)':'none'}}>
    {selected?<div style={{position:'absolute',left:-1,top:13,bottom:13,width:3,borderRadius:3,background:accent}}/>:null}
    <div style={{fontFamily:'Arial, Helvetica, sans-serif',fontSize:12,fontWeight:800,color:'#111'}}>{name}</div>
    <div style={{fontFamily:'Arial, Helvetica, sans-serif',fontSize:10,color:muted,marginTop:2}}>{company}</div>
    <div style={{marginTop:8}}><Pill tone={selected?'teal':'neutral'}>{status}</Pill></div>
  </div>
);

type LeadDetail = {
  name:string; company:string; industry:string; channel:string; service:string; volume:string; crm:string; problem:string; context:string;
  task:string; taskTime:string; status:string; note:string; brief:string; help:string; missing:string; signal:string;
};

const SOFIA: LeadDetail = {
  name:'Sofía Martínez',company:'Clínica Aurora',industry:'Estética facial',channel:'Instagram',service:'Estética facial',volume:'35 consultas/semana',crm:'WhatsApp + Excel',problem:'Interés detectado sin seguimiento posterior',context:'6/9 completo',
  task:'Retomar conversación y agendar llamada',taskTime:'Programada para hoy · 16:30',status:'Seguimiento',note:'Consultó por tratamientos y horarios',
  brief:'Hay interés claro, pero la conversación perdió continuidad después del primer contacto.',help:'Retomar hoy con contexto, confirmar tratamiento de interés y mantener una próxima acción asignada.',missing:'Tratamiento de interés y urgencia',signal:'Abrió el mensaje hace 18 min'
};

const DIEGO: LeadDetail = {
  name:'Diego Fuentes',company:'Diseño Norte',industry:'Diseño interior',channel:'Web + email',service:'Disiño interior',volume:'12 cotizaciones/mes',crm:'Email + planilla',problem:'Propuestas enviadas sin próxima acción definida',context:'5/9 completo',
  task:'Revisar propuesta y agendar seguimiento',taskTime:'Programada para hoy · 15:00',status:'Cotización',note:'Pidió revisar alcance y fecha de entrega',
  brief:'Existe interés comercial, pero el proceso posterior a la cotización no está estandarizado.',help:'Definir responsable, fecha y próxima acción antes de que la oportunidad se enfríe.',missing:'Presupuesto final y fecha de decisión',signal:'Abrió la propuesta hace 24 min'
};

const Cursor: React.FC<{x:number;y:number;opacity:number;clicking:number}> = ({x,y,opacity,clicking}) => (
  <div style={{position:'absolute',left:x,top:y,width:20,height:24,zIndex:90,opacity,transform:`translate(-1.5px,-1.5px) scale(${1-clicking*.05})`,filter:'drop-shadow(0 3px 5px rgba(0,0,0,.2))',pointerEvents:'none'}}>
    <div style={{width:15,height:20,background:'#111',clipPath:'polygon(0 0,0 92%,29% 69%,48% 100%,61% 92%,42% 63%,100% 63%)',borderRadius:2}}/>
    <div style={{position:'absolute',left:-6,top:-6,width:25,height:25,borderRadius:'50%',border:`1.5px solid rgba(10,63,77,${clicking*.58})`,transform:`scale(${.72+clicking*.42})`}}/>
  </div>
);

export const UnifiedCRMScene: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame,[488,528],[0,1],{...clamp,easing:Easing.out(Easing.cubic)});
  const settle = interpolate(frame,[528,550],[0,1],{...clamp,easing:Easing.out(Easing.cubic)});
  const exitProgress = interpolate(frame,[770,804],[0,1],{...clamp,easing:Easing.in(Easing.cubic)});
  const whiteFade = interpolate(frame,[786,804],[0,1],{...clamp,easing:Easing.inOut(Easing.cubic)});

  // One continuous interaction timeline. Sparse waypoints avoid the stop-start feel
  // caused by repeatedly easing through many near-identical cursor positions.
  const DIEGO_CLICK = 584;
  const SOFIA_CLICK = 626;
  const STATE_OPEN_CLICK = 672;
  const MEETING_CLICK = 696;

  const diegoSelected = frame >= DIEGO_CLICK && frame < SOFIA_CLICK;
  const selected = diegoSelected ? DIEGO : SOFIA;
  const meetingSelected = frame >= MEETING_CLICK;
  const shownStatus = !diegoSelected && meetingSelected ? 'Reunión agendada' : selected.status;

  // Give the Estado menu time to open, let the cursor travel down visibly,
  // then close only after the meeting option has been selected.
  const dropdownOpen = interpolate(frame,[STATE_OPEN_CLICK,678,700,706],[0,1,1,0],{...clamp,easing:Easing.inOut(Easing.cubic)});

  // Preserve the approved scroll: gentle movement first, then accelerating exit.
  const gentleScroll = interpolate(frame,[710,750],[0,-150],{...clamp,easing:Easing.inOut(Easing.cubic)});
  const exitScroll = interpolate(frame,[750,804],[0,-620],{...clamp,easing:Easing.in(Easing.cubic)});
  const scroll = snapToRenderPixel(gentleScroll + exitScroll);

  // Continuous cursor choreography: enter -> Diego -> Sofia -> Estado -> Reunión -> AI Brief.
  // After selecting the meeting, the cursor moves into the AI Brief area and fades with the exit blur.
  const cursorOpacity = interpolate(frame,[540,548],[0,1],clamp) * (1-exitProgress);
  const cursorX = interpolate(
    frame,
    [540,584,626,672,696,710],
    [-32,180,180,1100,1100,930],
    {...clamp,easing:Easing.bezier(0.32,0.04,0.22,1)},
  );
  const cursorY = interpolate(
    frame,
    [540,584,626,672,696,710],
    [176,372,205,408,480,560],
    {...clamp,easing:Easing.bezier(0.32,0.04,0.22,1)},
  );
  const clicking = Math.max(
    interpolate(frame,[581,DIEGO_CLICK,587],[0,1,0],clamp),
    interpolate(frame,[623,SOFIA_CLICK,629],[0,1,0],clamp),
    interpolate(frame,[669,STATE_OPEN_CLICK,675],[0,1,0],clamp),
    interpolate(frame,[693,MEETING_CLICK,699],[0,1,0],clamp),
  );

  const activity = diegoSelected
    ? [['14:16','Email','Solicitó revisar alcance y fecha.'],['13:48','Cotización','Propuesta enviada por email.'],['12:55','Lead creado','Ingreso desde formulario web.']]
    : [['11:42','Nota añadida','Preguntó por horarios y disponibilidad.'],['11:18','Instagram','Solicitó información sobre tratamiento facial.'],['10:56','Lead creado','Ingreso desde campaña Meta Ads.']];

  return (
    <div style={{position:'absolute',inset:0,opacity:reveal,backgroundColor:`rgba(255,255,255,${whiteFade})`,transform:`perspective(1400px) translateY(${interpolate(reveal,[0,1],[30,0])}px) scale(${interpolate(reveal,[0,1],[.82,1])}) rotateX(${interpolate(reveal,[0,1],[3.5,0])}deg)`,transformOrigin:'50% 50%',fontFamily:'Arial, Helvetica, sans-serif',zIndex:40}}>
      <div style={{position:'absolute',left:58,top:48,width:1164,height:624,borderRadius:28,border:'1px solid rgba(10,63,77,.18)',background:'#F7F7F5',boxShadow:`0 34px 88px rgba(14,24,22,${.12+settle*.06}),0 4px 14px rgba(10,63,77,.06)`,overflow:'hidden',opacity:1-exitProgress,filter:`blur(${exitProgress*9}px)`,transform:`scale(${1+exitProgress*.055})`,transformOrigin:'50% 50%'}}>
        <div style={{height:58,background:'#FFF',borderBottom:`1px solid ${softBorder}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:30,height:30,borderRadius:10,background:accent,color:'#FFF',display:'grid',placeItems:'center',fontSize:13,fontWeight:900}}>G</div>
            <div><Label teal>CRM // INTERNO</Label><div style={{fontSize:14,fontWeight:800,marginTop:2}}>Oportunidades</div></div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}><Pill tone="teal">12 activas</Pill><Pill>Firestore conectado</Pill></div>
        </div>

        <div style={{display:'flex',height:566}}>
          <aside style={{width:278,borderRight:`1px solid ${softBorder}`,background:'#FAFAFA',padding:16,boxSizing:'border-box'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',marginBottom:12}}>
              <div><Label>Lead pipeline</Label><div style={{fontSize:12,fontWeight:800,marginTop:4}}>Trabajo prioritario</div></div><span style={{fontSize:10,color:muted}}>4 leads</span>
            </div>
            <div style={{display:'grid',gap:8}}>
              <LeadRow name="Sofía Martínez" company="Clínica Aurora" status="Seguimiento hoy" selected={!diegoSelected}/>
              <LeadRow name="Valentina Ríos" company="Logística Andina" status="Nuevo lead" selected={false}/>
              <LeadRow name="Diego Fuentes" company="Diseño Norte" status="Cotización" selected={diegoSelected}/>
              <LeadRow name="Martín Silva" company="Studio Forma" status="Esperando respuesta" selected={false}/>
            </div>
            <div style={{marginTop:12,borderRadius:14,border:`1px solid ${softBorder}`,background:'#FFF',padding:12}}><Label teal>Priority work</Label><div style={{fontSize:11,lineHeight:1.4,color:'#5E6662',marginTop:7}}>Ordenado por urgencia operativa y próxima acción.</div></div>
          </aside>

          <main style={{position:'relative',flex:1,background:'#F1F3F2',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,transform:`translateY(${scroll}px)`}}>
              <div style={{padding:'18px 20px 24px'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',borderBottom:`1px solid ${softBorder}`,paddingBottom:14}}>
                  <div><Label teal>REGISTRO CRM // {selected.channel}</Label><div style={{fontSize:23,lineHeight:1.05,fontWeight:900,letterSpacing:-.5,marginTop:6}}>{selected.name}</div><div style={{fontSize:12,color:muted,marginTop:5}}>{selected.company} · {selected.industry}</div></div>
                  <div style={{display:'flex',gap:8}}><Pill tone="teal">{shownStatus}</Pill><Pill tone="amber">Prioridad alta</Pill></div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1.15fr .85fr',gap:14,marginTop:14}}>
                  <section style={{border:`1px solid ${border}`,borderRadius:18,background:'linear-gradient(180deg,#FFFFFF 0%,#FBFCFB 100%)',padding:15,boxShadow:'0 14px 34px rgba(20,34,31,.075)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><Label>Perfil del negocio y calificación</Label><div style={{fontSize:10,color:muted,marginTop:4}}>Contexto para AI Brief</div></div><Pill tone="teal">{selected.context}</Pill></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}><MiniField label="Canal" value={selected.channel}/><MiniField label="Servicio" value={selected.service}/><MiniField label="Volumen" value={selected.volume}/><MiniField label="CRM actual" value={selected.crm}/></div>
                    <div style={{marginTop:8}}><MiniField label="Problema principal" value={selected.problem}/></div>
                  </section>

                  <section style={{border:'1px solid rgba(10,63,77,.20)',borderRadius:18,background:'linear-gradient(180deg,#F8FAF9 0%,#F1F5F4 100%)',padding:15,boxShadow:'0 16px 38px rgba(10,63,77,.105)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:10}}><div><Label teal>Qué toca hacer ahora</Label><div style={{fontSize:10,color:muted,marginTop:4}}>Resumen operativo del lead</div></div><Pill tone="amber">Alta</Pill></div>
                    <div style={{marginTop:12,border:`1px solid ${softBorder}`,borderRadius:14,background:'#FFF',padding:12}}><Label>Tarea pendiente</Label><div style={{fontSize:16,fontWeight:900,lineHeight:1.12,marginTop:7}}>{selected.task}</div><div style={{fontSize:10,color:muted,marginTop:7}}>{selected.taskTime}</div></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}><MiniField label="Responsable" value="Equipo comercial"/><div style={{position:'relative'}}><MiniField label="Estado" value={shownStatus} interactive changed={!diegoSelected&&meetingSelected}/>
                      {!diegoSelected?<div style={{position:'absolute',left:0,right:0,top:61,borderRadius:12,border:'1px solid rgba(10,63,77,.18)',background:'#FFF',boxShadow:'0 14px 28px rgba(17,30,27,.16)',padding:6,opacity:dropdownOpen,transform:`translateY(${(1-dropdownOpen)*-6}px) scale(${.98+dropdownOpen*.02})`,transformOrigin:'50% 0%',zIndex:20}}>{['Seguimiento','Reunión agendada','Cliente'].map((option)=>{const active=option==='Reunión agendada'&&frame>=690;return <div key={option} style={{borderRadius:8,padding:'7px 8px',fontSize:10,fontWeight:active?800:600,color:active?accent:'#4E5552',background:active?'#F1F7F6':'#FFF'}}>{option}</div>;})}</div>:null}
                    </div></div>
                    <div style={{marginTop:8,border:`1px solid ${softBorder}`,borderRadius:12,background:'#FFF',padding:10}}><Label>Última nota</Label><div style={{fontSize:11,fontWeight:700,marginTop:6}}>{selected.note}</div><div style={{fontSize:9,color:muted,marginTop:3}}>Hoy · {diegoSelected?'14:16':'11:42'}</div></div>
                  </section>
                </div>

                <section style={{marginTop:14,border:'1px solid rgba(10,63,77,.22)',borderRadius:20,background:'linear-gradient(180deg,#F5F9F8 0%,#EDF5F3 100%)',padding:16,boxShadow:'0 14px 34px rgba(10,63,77,.09)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}><div><Label teal>G-KAIS AI BRIEF</Label><div style={{fontSize:11,color:'#657477',marginTop:5}}>Análisis comercial usando ficha, contexto e historial del lead.</div></div><Pill tone="teal">Intención · Alta</Pill></div>
                  <div style={{display:'grid',gridTemplateColumns:'1.25fr .75fr',gap:12,marginTop:12}}><div style={{borderRadius:14,background:'#FFF',border:'1px solid rgba(10,63,77,.10)',padding:12}}><div style={{fontSize:13,fontWeight:800,lineHeight:1.35}}>{selected.brief}</div><div style={{height:1,background:'#E6ECEB',margin:'10px 0'}}/><Label teal>Cómo puede ayudar</Label><div style={{fontSize:11,lineHeight:1.4,color:'#4E5955',marginTop:5}}>{selected.help}</div></div><div style={{display:'grid',gap:8}}><MiniField label="Falta saber" value={selected.missing}/><MiniField label="Señal reciente" value={selected.signal}/></div></div>
                </section>

                <section style={{marginTop:14,border:`1px solid ${border}`,borderRadius:18,background:'linear-gradient(180deg,#FFFFFF 0%,#FAFBFA 100%)',padding:14,boxShadow:'0 12px 30px rgba(20,34,31,.07)'}}>
                  <Label>Actividad del lead</Label><div style={{display:'grid',gap:7,marginTop:10}}>{activity.map(([time,title,text])=><div key={time} style={{display:'grid',gridTemplateColumns:'48px 108px 1fr',gap:10,alignItems:'center'}}><span style={{fontSize:9,fontWeight:600,color:'#606060'}}>{time}</span><span style={{fontSize:10,fontWeight:800}}>{title}</span><span style={{fontSize:10,color:'#5F6663'}}>{text}</span></div>)}</div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>
      <Cursor x={cursorX} y={cursorY} opacity={cursorOpacity} clicking={clicking}/>
    </div>
  );
};