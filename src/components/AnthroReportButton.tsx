import React, { useState } from 'react';
import {
  REFERENCE, ACTIVITY_GROUPS, RefGroup,
  classify, classifyBMI, classifyWaistHip, classifyAbdominal,
  calculateBodyComposition, generateValoracion
} from '../lib/anthropometry';
import { useCompany } from '../context/CompanyContext';

interface Props {
  session: any;   // full session row from DB
  patient: any;   // patient row (needs first_name, last_name, sex, birth_date)
  latestConsult?: any; // optional last consultation
}

function getAge(birthDate: string): number {
  if (!birthDate) return 30;
  const today = new Date(), dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function AnthroReportButton({ session, patient, latestConsult }: Props) {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [chosenGroup, setChosenGroup] = useState('');

  // Determine activity_group: use stored value or ask user
  const activityGroup = session.activity_group || chosenGroup;

  function handleDownload(group?: string) {
    const ag = group || activityGroup;
    if (!ag) { setShowGroupPicker(true); return; }

    setLoading(true);
    setShowGroupPicker(false);

    const reportEl = document.getElementById('anthro-print-report');
    if (!reportEl) { setLoading(false); return; }

    const patientName = `${patient.last_name}, ${patient.first_name}`;
    // Open a clean blank window — triggered directly from a click so popup blockers allow it
    const printWin = window.open('', '_blank');
    if (!printWin) { setLoading(false); return; }

    printWin.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Informe Antropométrico - ${patientName}</title>
      <style>
        @page { margin: 10mm; size: A4 portrait; }
        html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111; background: white; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
        #anthro-content-wrapper { max-width: 190mm; width: 100%; overflow: hidden; }
        table { width: 100%; table-layout: auto; }
        svg { max-width: 100%; height: auto; }
        /* Prevent any element from overflowing the page */
        div, td, th, p, span { max-width: 100%; word-break: break-word; }
      </style>
    </head><body><div id="anthro-content-wrapper">${reportEl.innerHTML}</div></body></html>`);
    printWin.document.close();

    setTimeout(() => {
      printWin.focus();
      printWin.print();
      printWin.addEventListener('afterprint', () => printWin.close());
      setLoading(false);
    }, 400);
  }

  // ── Compute results ────────────────────────────────────────────────────────
  const sex = patient.sex || 'Masculino';
  const age = getAge(patient.birth_date || '');
  const ag  = activityGroup || 'Activa - 31 a 50 años';
  const ref: RefGroup = (REFERENCE[sex] || REFERENCE['Masculino'])[ag] || REFERENCE['Masculino']['Activa - 31 a 50 años'];

  let results: any = null;
  try {
    const numericSession = { ...session };
    results = calculateBodyComposition(numericSession, sex, age);
    results = { ...results, sex, age, activity_group: ag, weight: session.weight, height: session.height, session_date: session.session_date, rawData: session };
  } catch { /* insufficient data — button will be disabled */ }

  // ── PDF-only SVG helpers ───────────────────────────────────────────────────
  const BMIBar = (bmi: number) => {
    const W = 160, H = 16, minV = 14, maxV = 42;
    const p = (v: number) => Math.max(0, Math.min(1, (v - minV) / (maxV - minV))) * W;
    const zones = [{ min:14,max:18.5,color:'#bfdbfe'},{min:18.5,max:25,color:'#bbf7d0'},{min:25,max:30,color:'#fde68a'},{min:30,max:35,color:'#fdba74'},{min:35,max:42,color:'#fca5a5'}];
    const vx = p(bmi);
    return <svg width={W} height={H} style={{display:'block'}}>{zones.map((z,i)=><rect key={i} x={p(z.min)} y={2} width={Math.max(0,p(z.max)-p(z.min))} height={H-4} fill={z.color}/>)}<circle cx={vx} cy={H/2} r={4} fill="#0A4D3C"/><circle cx={vx} cy={H/2} r={2} fill="white"/></svg>;
  };
  const ICCBar = (icc: number, s: string) => {
    const W=160,H=16,minV=0.6,maxV=1.15, p=(v:number)=>Math.max(0,Math.min(1,(v-minV)/(maxV-minV)))*W;
    const t1=s==='Masculino'?0.90:0.85, t2=s==='Masculino'?1.00:0.90;
    const zones=[{min:minV,max:t1,color:'#bbf7d0'},{min:t1,max:t2,color:'#fde68a'},{min:t2,max:maxV,color:'#fca5a5'}];
    const vx=p(icc);
    return <svg width={W} height={H} style={{display:'block'}}>{zones.map((z,i)=><rect key={i} x={p(z.min)} y={2} width={Math.max(0,p(z.max)-p(z.min))} height={H-4} fill={z.color}/>)}<circle cx={vx} cy={H/2} r={4} fill="#0A4D3C"/><circle cx={vx} cy={H/2} r={2} fill="white"/></svg>;
  };
  const AbdBar = (cm: number, s: string) => {
    const W=160,H=16,minV=55,maxV=130, p=(v:number)=>Math.max(0,Math.min(1,(v-minV)/(maxV-minV)))*W;
    const t1=s==='Masculino'?94:80, t2=s==='Masculino'?102:88;
    const zones=[{min:minV,max:t1,color:'#bbf7d0'},{min:t1,max:t2,color:'#fde68a'},{min:t2,max:maxV,color:'#fca5a5'}];
    const vx=p(cm);
    return <svg width={W} height={H} style={{display:'block'}}>{zones.map((z,i)=><rect key={i} x={p(z.min)} y={2} width={Math.max(0,p(z.max)-p(z.min))} height={H-4} fill={z.color}/>)}<circle cx={vx} cy={H/2} r={4} fill="#0A4D3C"/><circle cx={vx} cy={H/2} r={2} fill="white"/></svg>;
  };
  const CompBar = (value: number, mean: number, maxDiff: number) => {
    const W=140,H=12,cx=W/2, scale=(W/2)/maxDiff, vx=Math.max(4,Math.min(W-4,cx+(value-mean)*scale)), isHigh=value>mean;
    return <svg width={W} height={H} style={{display:'block'}}><rect x={0} y={4} width={W} height={H-8} fill="#f3f4f6" rx="2"/>{isHigh?<rect x={cx} y={4} width={vx-cx} height={H-8} fill="#fca5a5"/>:<rect x={vx} y={4} width={cx-vx} height={H-8} fill="#6ee7b7"/>}<line x1={cx} y1={1} x2={cx} y2={H-1} stroke="#9ca3af" strokeWidth={1}/><circle cx={vx} cy={H/2} r={4} fill={isHigh?'#ef4444':'#059669'}/><circle cx={vx} cy={H/2} r={2} fill="white"/></svg>;
  };
  const FatDistBar = (sup: number, med: number, inf: number, rSup: number, rMed: number, rInf: number) => {
    const W=220,H=28, tot=sup+med+inf, rTot=rSup+rMed+rInf;
    const s1=(sup/tot)*W, m1=(med/tot)*W, rs1=(rSup/rTot)*W, rm1=(rMed/rTot)*W;
    return <svg width={W} height={H+6} style={{display:'block'}}><rect x={0} y={0} width={s1} height={13} fill="#E05252" rx="1"/><rect x={s1} y={0} width={m1} height={13} fill="#D97706" rx="1"/><rect x={s1+m1} y={0} width={W-s1-m1} height={13} fill="#7CB9A0" rx="1"/>{s1>18&&<text x={s1/2} y={9.5} fill="white" fontSize={7.5} textAnchor="middle" fontWeight="bold">{sup.toFixed(0)}%</text>}{m1>18&&<text x={s1+m1/2} y={9.5} fill="white" fontSize={7.5} textAnchor="middle" fontWeight="bold">{med.toFixed(0)}%</text>}{W-s1-m1>18&&<text x={s1+m1+(W-s1-m1)/2} y={9.5} fill="white" fontSize={7.5} textAnchor="middle" fontWeight="bold">{inf.toFixed(0)}%</text>}<rect x={0} y={16} width={rs1} height={8} fill="#E05252" opacity={0.25} rx="1"/><rect x={rs1} y={16} width={rm1} height={8} fill="#D97706" opacity={0.25} rx="1"/><rect x={rs1+rm1} y={16} width={W-rs1-rm1} height={8} fill="#7CB9A0" opacity={0.25} rx="1"/></svg>;
  };

  const clsBg = (cls: string) => {
    if (cls==='Excelente'||cls==='Muy Buena') return {bg:'#d1fae5',color:'#065f46'};
    if (cls==='Buena') return {bg:'#dcfce7',color:'#166534'};
    if (cls==='Regular') return {bg:'#fef9c3',color:'#92400e'};
    if (cls==='—') return {bg:'#f3f4f6',color:'#6b7280'};
    return {bg:'#fee2e2',color:'#991b1b'};
  };

  const tdL = {padding:'5px 8px',fontWeight:'bold' as const,fontSize:'11px'};
  const tdV = {padding:'5px 8px',textAlign:'center' as const,fontSize:'11px'};
  const tdM = {padding:'5px 8px',textAlign:'center' as const,fontSize:'11px',color:'#555'};

  const rd = session;
  const r  = results;
  const consult = latestConsult || null;
  const valoracion = r ? generateValoracion({...r, activity_group: ag}, patient.first_name, patient.last_name, ref) : '';

  const total = r ? r.fatMassKg + r.muscleMassKg + r.boneMassKg + r.residualMassKg : 1;
  const pieSlices = r ? [
    { pct: r.fatMassKg/total,      color: '#E05252', label: 'Adiposa',  pctVal: r.fatPct,      kg: r.fatMassKg      },
    { pct: r.muscleMassKg/total,   color: '#0A4D3C', label: 'Muscular', pctVal: r.musclePct,   kg: r.muscleMassKg   },
    { pct: r.boneMassKg/total,     color: '#7CB9A0', label: 'Ósea',     pctVal: r.bonePct,     kg: r.boneMassKg     },
    { pct: r.residualMassKg/total, color: '#B0B0B0', label: 'Residual', pctVal: r.residualPct, kg: r.residualMassKg },
  ] : [];
  let cum = -Math.PI / 2;
  const cx2 = 80, cy2 = 80, rr = 68;
  const piePaths = pieSlices.map(s => {
    const start = cum, end = cum + s.pct * 2 * Math.PI; cum = end;
    const x1=cx2+rr*Math.cos(start),y1=cy2+rr*Math.sin(start),x2=cx2+rr*Math.cos(end),y2=cy2+rr*Math.sin(end);
    return {...s, d:`M${cx2},${cy2} L${x1},${y1} A${rr},${rr} 0 ${s.pct>0.5?1:0},1 ${x2},${y2} Z`};
  });

  return (
    <>
      {/* ── Trigger Button ── */}
      <button
        onClick={() => handleDownload()}
        disabled={loading || !results}
        title={!results ? 'Datos insuficientes para generar informe' : 'Generar informe PDF'}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading
          ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        }
        {loading ? 'Generando...' : 'Informe PDF'}
      </button>

      {/* ── Activity Group Picker (Sleek Modern Modal) ── */}
      {showGroupPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
          <div className="bg-surface rounded-3xl p-8 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-border-color animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3 className="font-bold text-xl text-text-main mb-2">Grupo de Referencia</h3>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">Esta sesión es antigua y no tiene grupo de referencia. Elegí uno para comparar los resultados.</p>
            
            <div className="relative mb-6">
              <select
                className="w-full pl-4 pr-10 py-3.5 bg-bg border border-border-color rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium transition-all"
                value={chosenGroup}
                onChange={e => setChosenGroup(e.target.value)}
              >
                <option value="">— Seleccionar grupo —</option>
                {ACTIVITY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { if (chosenGroup) handleDownload(chosenGroup); }}
                disabled={!chosenGroup}
                className="w-full py-3.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-light transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                Generar Informe
              </button>
              <button 
                onClick={() => setShowGroupPicker(false)} 
                className="w-full py-3 text-sm font-bold text-text-muted hover:text-text-main transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden Report (shown only in print mode via anthro-printing CSS) ── */}
      {r && (
        <div id="anthro-print-report" style={{
          position: 'absolute', top: '-99999px', left: 0,
          visibility: 'hidden', pointerEvents: 'none',
          width: '100%', fontFamily: 'Arial, sans-serif', color: '#111',
          padding: '20px 24px', background: '#fff',
        }}>
          {/* Header */}
          <div style={{background:'linear-gradient(135deg, #0A4D3C 0%, #0d6b52 100%)',color:'#fff',padding:'18px 24px',borderRadius:'10px',marginBottom:'4px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:'10px',fontWeight:'bold',letterSpacing:'3px',opacity:0.6,marginBottom:'4px'}}>NUPLAN · {selectedCompany.toUpperCase()}</div>
                <div style={{fontSize:'22px',fontWeight:'bold',lineHeight:1.1}}>EVALUACIÓN ANTROPOMÉTRICA</div>
                <div style={{fontSize:'11px',marginTop:'5px',opacity:0.8}}>Valoración morfológica · Composición corporal</div>
              </div>
              <div style={{textAlign:'right',fontSize:'11px'}}>
                <div style={{fontWeight:'bold',fontSize:'13px'}}>Obs. N° {session.observation_number || 1}</div>
                <div style={{marginTop:'3px',opacity:0.85}}>{session.session_date}</div>
              </div>
            </div>
          </div>
          <div style={{background:'#e8f5f0',border:'1px solid #c8e0d6',borderTop:'none',borderRadius:'0 0 8px 8px',padding:'6px 24px',marginBottom:'14px',display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#0A4D3C'}}>
            <span><strong>Lic. Rosana Roldán</strong> · Licenciada en Nutrición</span>
            <span style={{fontWeight:'bold'}}>www.nuplan.com.ar</span>
          </div>

          {/* Demographics */}
          <div style={{background:'#f4f9f7',border:'1px solid #c8e0d6',borderRadius:'8px',padding:'12px 16px',marginBottom:'14px',pageBreakInside:'avoid'}}>
            <div style={{fontSize:'9px',fontWeight:'bold',letterSpacing:'2px',color:'#0A4D3C',marginBottom:'8px',textTransform:'uppercase'}}>Datos del Evaluado</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:'8px',fontSize:'12px'}}>
              {[
                {l:'Apellido y Nombre',v:`${patient.last_name}, ${patient.first_name}`},
                {l:'Sexo',v:sex},
                {l:'Edad',v:`${age} años`},
                {l:'Fecha de Evaluación',v:session.session_date},
                {l:'Grupo de Referencia',v:ag},
                {l:'Peso',v:`${r.weight} kg`},
                {l:'Talla',v:`${r.height} cm`},
                {l:'IMC',v:`${r.bmi} kg/m²`},
              ].map((item,i)=>(
                <div key={i}>
                  <div style={{fontSize:'9px',color:'#666',fontWeight:'bold',textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>{item.l}</div>
                  <div style={{fontWeight:'bold',marginTop:'1px'}}>{item.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Body Composition + Pie */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 175px',gap:'14px',marginBottom:'14px',pageBreakInside:'avoid'}}>
            <div>
              <div style={{background:'#0A4D3C',color:'#fff',padding:'7px 12px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'bold',letterSpacing:'1px'}}>COMPOSICIÓN CORPORAL</div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <thead><tr style={{background:'#f4f9f7'}}>
                  <th style={tdL}>Componente</th><th style={tdV}>%</th><th style={tdV}>kg</th><th style={tdV}>Ref. (M ± DE)</th><th style={tdV}>Clasif.</th>
                </tr></thead>
                <tbody>
                  {[
                    {name:'Masa Adiposa',  pct:r.fatPct,      kg:r.fatMassKg,      mean:ref.fatMassKg[0],    sd:ref.fatMassKg[1]},
                    {name:'Masa Muscular', pct:r.musclePct,   kg:r.muscleMassKg,   mean:ref.muscleMassKg[0], sd:ref.muscleMassKg[1]},
                    {name:'Masa Ósea',     pct:r.bonePct,     kg:r.boneMassKg,     mean:ref.boneMassKg[0],   sd:ref.boneMassKg[1]},
                    {name:'Masa Residual', pct:r.residualPct, kg:r.residualMassKg, mean:null as any,          sd:null as any},
                  ].map((row,i)=>{
                    const cls=row.mean!==null?classify(row.kg,row.mean,row.sd):'—'; const c=clsBg(cls);
                    return <tr key={i} style={{background:i%2===0?'#fff':'#fafafa',borderBottom:'1px solid #e5e7eb'}}>
                      <td style={tdL}>{row.name}</td>
                      <td style={tdV}>{row.pct}%</td>
                      <td style={{...tdV,fontWeight:'bold'}}>{row.kg} kg</td>
                      <td style={tdM}>{row.mean!==null?`${row.mean.toFixed(1)} ± ${row.sd.toFixed(1)} kg`:'—'}</td>
                      <td style={tdV}><span style={{background:c.bg,color:c.color,padding:'1px 6px',borderRadius:'3px',fontSize:'10px',fontWeight:'bold'}}>{cls}</span></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div style={{border:'1px solid #c8e0d6',borderRadius:'8px',padding:'10px',display:'flex',flexDirection:'column',alignItems:'center',background:'#f4f9f7'}}>
              <div style={{fontSize:'9px',fontWeight:'bold',letterSpacing:'1px',color:'#0A4D3C',marginBottom:'6px',textTransform:'uppercase' as const}}>Distribución</div>
              <svg width="100" height="100" viewBox="0 0 160 160">
                {piePaths.map((p,i)=><path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth="2"/>)}
              </svg>
              <div style={{marginTop:'8px',width:'100%'}}>
                {pieSlices.map((s,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'4px',marginBottom:'3px',fontSize:'9px'}}>
                    <div style={{width:'7px',height:'7px',borderRadius:'1px',background:s.color}}/>
                    <span style={{flex:1,color:'#444'}}>{s.label}</span>
                    <span style={{fontWeight:'bold'}}>{s.pctVal}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Adiposity Indices */}
          <div style={{marginBottom:'14px',pageBreakInside:'avoid'}}>
            <div style={{background:'#0A4D3C',color:'#fff',padding:'7px 12px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'bold',letterSpacing:'1px'}}>ÍNDICES DE ADIPOSIDAD</div>
            <div style={{border:'1px solid #c8e0d6',borderTop:'none',borderRadius:'0 0 6px 6px',overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <thead><tr style={{background:'#f4f9f7'}}>
                  <th style={tdL}>Índice</th><th style={tdV}>Valor</th><th style={tdM}>Referencia</th><th style={tdV}>Clasificación</th><th style={{...tdV,width:'175px'}}>Posición en escala</th>
                </tr></thead>
                <tbody>
                  {[
                    {name:'IMC (kg/m²)',value:`${r.bmi}`,ref2:'Normal: 18.5 – 24.9',cls:classifyBMI(r.bmi),chart:BMIBar(r.bmi)},
                    {name:'Índice Cintura-Cadera',value:`${r.waistHipRatio}`,ref2:sex==='Masculino'?'Normal: < 0.90':'Normal: < 0.85',cls:classifyWaistHip(r.waistHipRatio,sex),chart:ICCBar(r.waistHipRatio,sex)},
                    {name:'Perímetro Abdominal',value:`${r.girth_waist} cm`,ref2:sex==='Masculino'?'Sin riesgo: < 94 cm':'Sin riesgo: < 80 cm',cls:classifyAbdominal(r.girth_waist,sex),chart:AbdBar(r.girth_waist,sex)},
                  ].map((row,i)=>{ const c=clsBg(row.cls); return (
                    <tr key={i} style={{background:i%2===0?'#fff':'#fafafe',borderBottom:'1px solid #e5e7eb'}}>
                      <td style={{...tdL,paddingTop:'8px',paddingBottom:'8px'}}>{row.name}</td>
                      <td style={{...tdV,fontWeight:'bold',fontSize:'12px'}}>{row.value}</td>
                      <td style={tdM}>{row.ref2}</td>
                      <td style={tdV}><span style={{background:c.bg,color:c.color,padding:'2px 7px',borderRadius:'4px',fontSize:'9px',fontWeight:'bold',whiteSpace:'nowrap'}}>{row.cls}</span></td>
                      <td style={{padding:'6px 10px',textAlign:'center'}}>{row.chart}</td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>

          {/* Regional fat — full width to avoid page cuts */}
          <div style={{marginBottom:'14px',pageBreakInside:'avoid'}}>
            <div style={{background:'#0A4D3C',color:'#fff',padding:'7px 12px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'bold',letterSpacing:'1px'}}>DISTRIBUCIÓN REGIONAL DE GRASA</div>
            <div style={{border:'1px solid #c8e0d6',borderTop:'none',borderRadius:'0 0 6px 6px',padding:'10px 12px'}}>
              <div style={{display:'flex',gap:'16px',alignItems:'flex-start'}}>
                <table style={{flex:1,borderCollapse:'collapse',fontSize:'11px'}}>
                  <thead><tr style={{background:'#f4f9f7'}}><th style={tdL}>Región</th><th style={tdV}>%</th><th style={tdM}>Ref.</th><th style={tdV}>Clasif.</th></tr></thead>
                  <tbody>{[
                    {name:'Superior',value:r.fatSuperior,mean:ref.fatSuperior[0],sd:ref.fatSuperior[1]},
                    {name:'Media',   value:r.fatMedia,    mean:ref.fatMedia[0],   sd:ref.fatMedia[1]},
                    {name:'Inferior',value:r.fatInferior, mean:ref.fatInferior[0],sd:ref.fatInferior[1]},
                  ].map((row,i)=>{ const cls=classify(row.value,row.mean,row.sd); const c=clsBg(cls); return (
                    <tr key={i} style={{background:i%2===0?'#fff':'#fafafe',borderBottom:'1px solid #e5e7eb'}}>
                      <td style={{...tdL,paddingTop:'7px',paddingBottom:'7px'}}>{row.name}</td>
                      <td style={{...tdV,fontWeight:'bold'}}>{row.value}%</td>
                      <td style={tdM}>{row.mean.toFixed(1)}±{row.sd.toFixed(1)}%</td>
                      <td style={tdV}><span style={{background:c.bg,color:c.color,padding:'1px 5px',borderRadius:'3px',fontSize:'9px',fontWeight:'bold'}}>{cls}</span></td>
                    </tr>
                  );})}
                  </tbody>
                </table>
                <div style={{paddingTop:'4px'}}>
                  <div style={{fontSize:'8px',color:'#666',marginBottom:'4px',fontWeight:'bold',textTransform:'uppercase' as const}}>Distribución %</div>
                  {FatDistBar(r.fatSuperior,r.fatMedia,r.fatInferior,ref.fatSuperior[0],ref.fatMedia[0],ref.fatInferior[0])}
                </div>
              </div>
            </div>
          </div>

          {/* Perimeters — full width */}
          <div style={{marginBottom:'14px',pageBreakInside:'avoid'}}>
            <div style={{background:'#0A4D3C',color:'#fff',padding:'7px 12px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'bold',letterSpacing:'1px'}}>PERÍMETROS MUSCULARES</div>
            <div style={{border:'1px solid #c8e0d6',borderTop:'none',borderRadius:'0 0 6px 6px',overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <thead><tr style={{background:'#f4f9f7'}}><th style={tdL}>Perímetro</th><th style={tdV}>Medido</th><th style={tdM}>Ref.</th><th style={tdV}>Dif.</th><th style={tdV}>Gráfico</th></tr></thead>
                <tbody>{[
                  {name:'Tórax',   value:r.girth_chest,mean:ref.chestCm[0],sd:ref.chestCm[1]},
                  {name:'Cintura', value:r.girth_waist, mean:ref.waistCm[0],sd:ref.waistCm[1]},
                  {name:'Cadera',  value:r.girth_hip,   mean:ref.hipCm[0],  sd:ref.hipCm[1]},
                ].map((row,i)=>{ const diff=(row.value-row.mean).toFixed(1); return (
                  <tr key={i} style={{background:i%2===0?'#fff':'#fafafe',borderBottom:'1px solid #e5e7eb'}}>
                    <td style={{...tdL,paddingTop:'7px',paddingBottom:'7px'}}>{row.name}</td>
                    <td style={{...tdV,fontWeight:'bold'}}>{row.value} cm</td>
                    <td style={tdM}>{row.mean.toFixed(1)} cm</td>
                    <td style={{...tdV,fontWeight:'bold',color:parseFloat(diff)>0?'#991b1b':'#065f46'}}>{parseFloat(diff)>0?'+':''}{diff} cm</td>
                    <td style={{padding:'4px 8px',textAlign:'center'}}>{CompBar(row.value,row.mean,Math.max(row.sd*3,15))}</td>
                  </tr>
                );})}
                </tbody>
              </table>
            </div>
          </div>

          {/* Valoración */}
          <div style={{marginBottom:'14px',pageBreakInside:'avoid'}}>
            <div style={{background:'#0A4D3C',color:'#fff',padding:'7px 14px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'bold',letterSpacing:'1px'}}>VALORACIÓN MORFOLÓGICA PERSONAL</div>
            <div style={{border:'1px solid #c8e0d6',borderTop:'none',borderRadius:'0 0 6px 6px',background:'#fafffe',padding:'14px 16px'}}>
              {valoracion.split('\n').map((line,i)=>(
                line===''
                  ? <div key={i} style={{height:'6px'}}/>
                  : <p key={i} style={{margin:0,fontSize:'11px',lineHeight:'1.6',color:line.startsWith('•')?'#1a1a1a':'#444'}}>{line}</p>
              ))}
            </div>
          </div>

          {/* Last Consultation (if any) */}
          {consult && (
            <div style={{marginBottom:'14px'}}>
              <div style={{background:'#0A4D3C',color:'#fff',padding:'7px 14px',borderRadius:'6px 6px 0 0',fontSize:'10px',fontWeight:'bold',letterSpacing:'1px'}}>
                ÚLTIMA CONSULTA NUTRICIONAL · {consult.session_date}
              </div>
              <div style={{border:'1px solid #c8e0d6',borderTop:'none',borderRadius:'0 0 6px 6px',padding:'12px 16px'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'10px'}}>
                  {([
                    {l:'Fecha',v:consult.session_date},
                    {l:'Estado General',v:consult.overall_status||'—'},
                    {l:'Adherencia al Plan',v:`${consult.adherence}/5`},
                    {l:'Nivel de Energía',v:`${consult.energy_level}/5`},
                    {l:'Calidad de Sueño',v:`${consult.sleep_quality}/5`},
                    {l:'Hidratación',v:consult.hydration?'Adecuada':'Insuficiente'},
                    {l:'Actividad Física',v:consult.physical_activity||'—'},
                    {l:'Frutas y Verduras',v:consult.consumo_frutas_verduras?`${consult.consumo_frutas_verduras}/5`:'—'},
                  ] as {l:string;v:string}[]).map((item,i)=>(
                    <div key={i}><div style={{fontSize:'9px',color:'#666',fontWeight:'bold',textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>{item.l}</div><div style={{fontWeight:'bold',marginTop:'1px',fontSize:'11px'}}>{item.v}</div></div>
                  ))}
                </div>
                {consult.laboratorio_alterado && (
                  <div style={{marginBottom:'8px',background:'#fff8f0',border:'1px solid #fde68a',borderRadius:'4px',padding:'8px 10px'}}>
                    <div style={{fontSize:'9px',fontWeight:'bold',color:'#92400e',textTransform:'uppercase' as const,marginBottom:'3px'}}>Laboratorio Alterado</div>
                    <div style={{fontSize:'10px',color:'#333',lineHeight:'1.5'}}>{consult.laboratorio_alterado}</div>
                  </div>
                )}
                {(consult.achievements||consult.difficulties) && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    {consult.achievements && <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'4px',padding:'8px 10px'}}><div style={{fontSize:'9px',fontWeight:'bold',color:'#065f46',textTransform:'uppercase' as const,marginBottom:'3px'}}>Logros</div><div style={{fontSize:'10px',color:'#333',lineHeight:'1.5'}}>{consult.achievements}</div></div>}
                    {consult.difficulties && <div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:'4px',padding:'8px 10px'}}><div style={{fontSize:'9px',fontWeight:'bold',color:'#92400e',textTransform:'uppercase' as const,marginBottom:'3px'}}>Dificultades</div><div style={{fontSize:'10px',color:'#333',lineHeight:'1.5'}}>{consult.difficulties}</div></div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{borderTop:'2px solid #0A4D3C',paddingTop:'8px',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'9px',color:'#555'}}>
            <div><span style={{fontWeight:'bold',color:'#0A4D3C'}}>Lic. Rosana Roldán</span> · <span style={{fontWeight:'bold',color:'#0A4D3C'}}>www.nuplan.com.ar</span></div>
            <div>{selectedCompany} · Datos comparados con población argentina de referencia.</div>
          </div>
        </div>
      )}
    </>
  );
}
