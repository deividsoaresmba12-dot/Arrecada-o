/*!
 * Acompanhamento GC Leste — interface
 * Abre vazio. Os dados vêm de uma pasta local escolhida pelo usuário e são processados só no navegador.
 * Nenhum dado é enviado para servidor e nenhum dado é salvo no navegador (só a referência da última pasta).
 * Cálculos em js/calculos.js.
 */
'use strict';
const C = window.Calculos;
const { PRIOS, NOMES_MES, sum, norm, mcNome, clsDe } = C;
const VERSAO = '1.1.0';

const CRIT={
  'CRÍTICA':'% arrecadado < 50% ou saldo vencido (sem parcelamento) ≥ R$ 1.000.000,00, exceto quem arrecadou ≥ 95%',
  'ALTA':'% arrecadado de 50% a 74,9% ou saldo vencido ≥ R$ 300.000,00, exceto quem arrecadou ≥ 95%',
  'MÉDIA':'% arrecadado de 75% a 94,9% ou saldo vencido ≥ R$ 100.000,00 (inclui quem arrecadou ≥ 95% com saldo vencido alto)',
  'BAIXA':'% arrecadado ≥ 95%, saldo vencido < R$ 100 mil e mais de 1 fatura não parcelada em aberto',
  'REGULAR':'% arrecadado ≥ 95%, saldo vencido < R$ 100 mil e até 1 fatura não parcelada em aberto'
};
const ACAO={
  'CRÍTICA':'Gestor em 48h, notificação e acordo.',
  'ALTA':'Contato em 7 dias e plano de pagamento.',
  'MÉDIA':'Lembrete preventivo e acompanhamento quinzenal.',
  'BAIXA':'Régua automática e monitoramento mensal.',
  'REGULAR':'Manter relacionamento; sem cobrança.'
};
const fmt=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK=v=>{const a=Math.abs(v);return a>=1e6?'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi':a>=1e3?'R$ '+(v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:0})+' mil':'R$ '+v.toLocaleString('pt-BR')};
const R=v=>fmt.format(v||0);
const P=v=>isFinite(v)?(v*100).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%':'—';
const N=v=>(v||0).toLocaleString('pt-BR');
const N1=v=>(v||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dtBR=d=>d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const $=id=>document.getElementById(id);
const VZ='—', MSG_VAZIO='Nenhuma pasta conectada.';

/* ---------- estado ---------- */
let DATA=[], MONTHS=[], META={}, MESES=[], PERIODO='', PARCIAL=false, AJUSTES={}, VAZIO=true;
function prep(ds){
  const r=C.preparar(ds,ds.ajustes||{});
  DATA=r.DATA; MONTHS=r.MONTHS; MESES=r.MESES; PERIODO=r.PERIODO; PARCIAL=r.PARCIAL; META=ds.meta||{}; AJUSTES=ds.ajustes||{};
  VAZIO=!DATA.length;
  $('refMes').textContent=r.refMes;
  $('lblCol').textContent=VAZIO?'Mensal · Δ = diferença vs mês anterior (R$ mi)':`Mensal ${PERIODO} · Δ = diferença vs mês anterior (R$ mi)`;
  $('lblTop').textContent=VAZIO?'Ordenado por faturamento acumulado':`Ordenado por faturamento acumulado ${PERIODO}`;
  ['btnResumo','btnBaseXls'].forEach(id=>$(id).disabled=VAZIO);
  podarSel(); msRefresh(); status(); gaps(); render();
}
const VAZIO_DS={months:[],rows:[],meta:{}};
const pctClass=p=>p<0.5?'pct-low':p<0.95?'pct-mid':'pct-ok';

/* ---------- filtros ---------- */
const SEL={mun:new Set(),cls:new Set(),mat:new Set()};
const fMun={get value(){return [...SEL.mun].join(', ');}};
const fMat={get value(){return [...SEL.mat].join(', ');}};
const fCls={get value(){return [...SEL.cls].join(', ');}};
const MS={mun:{id:'msMun',label:'Município',todos:'Todos os municípios'},cls:{id:'msCls',label:'Classificação',todos:'Todas as classificações'},mat:{id:'msMat',label:'Matrícula',todos:'Todas as matrículas'}};
const passa=(d,skip)=>C.passa(d,SEL,skip);
function msOpcoes(key){
  if(key==='mun'){const b=DATA.filter(d=>passa(d,'mun'));return [...new Set(DATA.map(d=>d.c))].sort().map(v=>({v,l:v,n:b.filter(d=>d.c===v).length}));}
  if(key==='cls'){const b=DATA.filter(d=>(!SEL.mun.size||SEL.mun.has(d.c)));return [...new Set(DATA.map(clsDe))].sort().map(v=>({v,l:v,n:b.filter(d=>clsDe(d)===v).length}));}
  return DATA.filter(d=>(!SEL.mun.size||SEL.mun.has(d.c))&&(!SEL.cls.size||SEL.cls.has(clsDe(d)))).sort((a,b)=>b.F-a.F).map(d=>({v:String(d.m),l:`${d.m} – ${d.n}`,n:null}));
}
function podarSel(){
  const muns=new Set(DATA.map(d=>d.c)), cls=new Set(DATA.map(clsDe));
  [...SEL.mun].forEach(v=>{if(!muns.has(v))SEL.mun.delete(v);}); [...SEL.cls].forEach(v=>{if(!cls.has(v))SEL.cls.delete(v);});
  const ok=new Set(msOpcoes('mat').map(o=>o.v)); [...SEL.mat].forEach(v=>{if(!ok.has(v))SEL.mat.delete(v);});
}
const CARET='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
function msTexto(key){
  const s=SEL[key]; if(!s.size) return MS[key].todos;
  if(s.size===1){const v=[...s][0]; if(key==='mat'){const d=DATA.find(x=>String(x.m)===v); return d?`${d.m} – ${d.n}`:v;} return v;}
  return `${s.size} selecionad${key==='mun'?'os':'as'}`;
}
function msRefresh(){Object.keys(MS).forEach(k=>{const r=$(MS[k].id); const b=r.querySelector('.ms-btn'); b.querySelector('.ms-txt').textContent=msTexto(k); b.classList.toggle('on',SEL[k].size>0); b.title=SEL[k].size?msTexto(k)+': '+[...SEL[k]].join(', '):MS[k].todos; if(!r.querySelector('.ms-pop').hidden) msLista(k);});}
function msLista(key){
  const r=$(MS[key].id), q=r.querySelector('.ms-q').value.trim().toLowerCase();
  const ops=msOpcoes(key).filter(o=>!q||o.l.toLowerCase().includes(q));
  r.querySelector('.ms-list').innerHTML=ops.length?ops.map(o=>`<label class="ms-opt"><input type="checkbox" value="${esc(o.v)}"${SEL[key].has(o.v)?' checked':''}><span title="${esc(o.l)}">${esc(o.l)}</span>${o.n!=null?`<em>${o.n}</em>`:''}</label>`).join(''):`<div class="ms-vazio">${VAZIO?MSG_VAZIO:'Nada encontrado'}</div>`;
}
function msFechar(except){Object.keys(MS).forEach(k=>{if(k===except)return;const r=$(MS[k].id);r.querySelector('.ms-pop').hidden=true;r.querySelector('.ms-btn').setAttribute('aria-expanded','false');});}
function msMudou(key){ if(key!=='mat'){const ok=new Set(msOpcoes('mat').map(o=>o.v));[...SEL.mat].forEach(v=>{if(!ok.has(v))SEL.mat.delete(v);});} msRefresh(); render(); }
Object.keys(MS).forEach(key=>{
  const r=$(MS[key].id);
  r.innerHTML=`<span class="ms-lbl">${MS[key].label}</span><button type="button" class="ms-btn" aria-haspopup="listbox" aria-expanded="false"><span class="ms-txt"></span>${CARET}</button><div class="ms-pop" hidden><input class="ms-q" type="search" placeholder="Buscar ${MS[key].label.toLowerCase()}…" autocomplete="off" aria-label="Buscar ${MS[key].label.toLowerCase()}"><div class="ms-acts"><button type="button" data-a="all">Marcar todos</button><button type="button" data-a="none">Limpar</button></div><div class="ms-list" role="listbox" aria-multiselectable="true"></div></div>`;
  const btn=r.querySelector('.ms-btn'), pop=r.querySelector('.ms-pop'), q=r.querySelector('.ms-q');
  btn.addEventListener('click',()=>{const abrir=pop.hidden; msFechar(key); pop.hidden=!abrir; btn.setAttribute('aria-expanded',String(abrir)); if(abrir){q.value='';msLista(key);q.focus();}});
  q.addEventListener('input',()=>msLista(key));
  r.querySelector('.ms-list').addEventListener('change',e=>{const c=e.target; if(c.type!=='checkbox')return; c.checked?SEL[key].add(c.value):SEL[key].delete(c.value); msMudou(key);});
  r.querySelector('.ms-acts').addEventListener('click',e=>{const a=e.target.dataset.a; if(!a)return; if(a==='none') SEL[key].clear(); else {const qq=q.value.trim().toLowerCase(); msOpcoes(key).filter(o=>!qq||o.l.toLowerCase().includes(qq)).forEach(o=>SEL[key].add(o.v));} msLista(key); msMudou(key);});
});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.ms'))msFechar();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.ms-pop:not([hidden])')){msFechar();}});
const filtered=()=>C.filtrar(DATA,SEL);

/* ---------- gráficos ---------- */
let chCol, chLin, PARETO_M='s';
const deltaCurto=x=>x>=1e6?(x/1e6).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' mi':x>=1e3?Math.round(x/1e3).toLocaleString('pt-BR')+' mil':Math.round(x).toLocaleString('pt-BR');
function charts(rows){
  if(!window.Chart) return;
  Chart.defaults.font.family="'IBM Plex Sans','Segoe UI',Arial,sans-serif";
  const n=MONTHS.length;
  const {f,a}=C.serieMensal(rows,n);
  {const m=C.mediasMensais(f,a);
   $('colNota').innerHTML=VAZIO?MSG_VAZIO:`Média mensal ${PERIODO}: <b>Faturado ${R(m.mF)}</b> · <b>Arrecadado ${R(m.mA)}</b> · arrecadação média de <b>${P(m.pct)}</b> do faturado (${m.nm} meses)`;}
  const labels=MESES.map((m,i)=>i===n-1&&PARCIAL?m+'*':m);
  const tick={color:'#5b6578',font:{family:'IBM Plex Sans',size:12}};
  const grid={color:'rgba(18,58,122,.08)'};
  const leg={labels:{color:'#05050D',font:{family:'IBM Plex Sans',size:13}}};
  if(chCol){chCol.data.labels=labels;chCol.data.datasets[0].data=f;chCol.data.datasets[1].data=a;chCol.update();}
  else chCol=new Chart($('cCol'),{type:'bar',data:{labels,datasets:[
    {label:'Faturado',data:f,backgroundColor:'#123A7A',borderRadius:3,maxBarThickness:28},
    {label:'Arrecadado',data:a,backgroundColor:'#4A86D2',borderRadius:3,maxBarThickness:28}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:4}},plugins:{legend:leg,tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${R(c.raw)}`,afterLabel:c=>{const i=c.dataIndex;if(!i)return '';const ant=c.dataset.data[i-1]||0,v=c.raw||0,dv=v-ant;return `   Δ vs ${MESES[i-1]}: ${dv>=0?'+':'−'}${R(Math.abs(dv))}${ant?` (${dv>=0?'+':'−'}${P(Math.abs(dv/ant))})`:''}`;}}}},
    scales:{x:{ticks:tick,grid:{display:false}},y:{grace:'6%',ticks:{...tick,callback:v=>fmtK(v)},grid}}},
    plugins:[{id:'espacoDelta',beforeInit(ch){const fit=ch.legend.fit;ch.legend.fit=function(){fit.call(this);this.height+=40;};}},{id:'deltaMes',afterDatasetsDraw(ch){
      const ctx=ch.ctx, ca=ch.chartArea, ds=ch.data.datasets; if(ds.length<2) return;
      const mf=ch.getDatasetMeta(0), ma=ch.getDatasetMeta(1), n=ch.data.labels.length;
      const largura=(ca.right-ca.left)/Math.max(1,n), dec=largura<46?1:2, fs=largura<34?8.5:largura<46?9.5:11;
      const linhas=[{lbl:'Δ Fat →',cor:'#123A7A',d:C.deltas(ds[0].data),y:ca.top-30},{lbl:'Δ Arr →',cor:'#4A86D2',d:C.deltas(ds[1].data),y:ca.top-13}];
      ctx.save(); ctx.textBaseline='middle';
      linhas.forEach(L=>{
        ctx.font="700 10.5px 'IBM Plex Sans','Segoe UI',Arial,sans-serif"; ctx.fillStyle=L.cor; ctx.textAlign='right'; ctx.fillText(L.lbl,ca.left-6,L.y);
        ctx.font=`600 ${fs}px 'IBM Plex Sans','Segoe UI',Arial,sans-serif`; ctx.textAlign='center';
        for(let i=0;i<n;i++){ const x=((mf.data[i]?.x??0)+(ma.data[i]?.x??0))/2;
          const dv=L.d[i];
          if(dv==null){ctx.fillStyle='#9aa3b2';ctx.fillText('–',x,L.y);continue;}
          ctx.fillStyle=dv>=0?'#1f8a70':'#B42318';
          ctx.fillText((dv>=0?'+':'−')+Math.abs(dv/1e6).toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec}),x,L.y); }
      });
      ctx.restore();}}]});
  /* ---- Pareto 80/20 por macro cluster ---- */
  const met=PARETO_M, pa=C.pareto(rows,met);
  const bg=pa.vital.map(v=>v?'#123A7A':'#A9C2E6');
  const nomeMet=met==='n'?'Matrículas':met==='sv'?'Saldo vencido':'Saldo de conta';
  $('paretoNota').innerHTML=VAZIO?MSG_VAZIO:pa.n?`<b>${pa.nv} de ${pa.n}</b> macro clusters (${P(pa.pctGrupos)}) concentram <b>${P(pa.pctConc)}</b> ${met==='n'?'das matrículas':'do '+nomeMet.toLowerCase()} · barras escuras = grupo que chega a 80% · clique numa barra para ver as matrículas`:'Sem dados no filtro atual.';
  if(chLin){const d0=chLin.data.datasets[0];chLin.data.labels=pa.labels;d0.data=pa.valores;d0.backgroundColor=bg;d0.label=nomeMet;chLin.data.datasets[1].data=pa.cum;chLin.update();}
  else chLin=new Chart($('cLin'),{type:'bar',data:{labels:pa.labels,datasets:[
    {type:'bar',label:nomeMet,data:pa.valores,backgroundColor:bg,borderRadius:3,maxBarThickness:58,order:2},
    {type:'line',label:'% acumulado',data:pa.cum,yAxisID:'y2',borderColor:'#E8710A',backgroundColor:'#E8710A',pointRadius:3.5,borderWidth:2,tension:0,order:1}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
      onClick:(e,els)=>{const el=els.find(x=>x.datasetIndex===0)||els[0]; if(el) abrirPrio(null,null,chLin.data.labels[el.index]);},
      onHover:(e,els)=>{e.native&&(e.native.target.style.cursor=els.length?'pointer':'default');},
      plugins:{legend:leg,tooltip:{callbacks:{label:c=>{if(c.datasetIndex===1)return ` % acumulado: ${P(c.raw/100)}`;const t2=sum(c.dataset.data);return PARETO_M==='n'?` ${N(c.raw)} matrículas (${P(t2?c.raw/t2:0)})`:` ${c.dataset.label}: ${R(c.raw)} (${P(t2?c.raw/t2:0)})`;}}}},
      scales:{x:{ticks:{...tick,autoSkip:false,maxRotation:0,font:{family:'IBM Plex Sans',size:11}},grid:{display:false}},
        y:{grace:'12%',ticks:{...tick,callback:v=>PARETO_M==='n'?v:fmtK(v)},grid},
        y2:{position:'right',min:0,max:100,ticks:{...tick,stepSize:20,callback:v=>v+'%'},grid:{display:false}}}},
    plugins:[{id:'paretoRotulos',afterDatasetsDraw(ch){
      const ctx=ch.ctx; ctx.save();
      ctx.textBaseline='bottom'; ctx.textAlign='center';
      const b=ch.getDatasetMeta(0), l=ch.getDatasetMeta(1);
      b.data.forEach((bar,i)=>{const v=ch.data.datasets[0].data[i]; ctx.fillStyle='#123A7A'; ctx.font="600 10.5px 'IBM Plex Sans','Segoe UI',Arial,sans-serif";
        ctx.fillText(PARETO_M==='n'?N(v):deltaCurto(v),bar.x,bar.y-3);});
      l.data.forEach((pt,i)=>{const v=ch.data.datasets[1].data[i]; ctx.fillStyle='#C2560C'; ctx.font="600 10px 'IBM Plex Sans','Segoe UI',Arial,sans-serif";
        const by=b.data[i]?b.data[i].y-15:pt.y; ctx.fillText(P(v/100),pt.x,Math.min(pt.y-6,by));});
      ctx.restore();}}]});
}

/* ---------- cartões ---------- */
function kpis(rows){
  const t=C.totais(rows,MONTHS.length), {F,A,S,fm,am,p}=t, nFat=t.nFat;
  const ref=$('refMes').textContent, mesLbl=ref.charAt(0)+ref.slice(1).toLowerCase();
  $('refNote').textContent=VAZIO?MSG_VAZIO:PARCIAL?`Mês parcial: ${nFat} de ${rows.length} matrículas faturadas`:`${nFat} de ${rows.length} matrículas faturadas no mês`;
  const curto=v=>{const a=Math.abs(v);return a>=1e6?'R$ '+(v/1e6).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' mi':a>=1e3?'R$ '+(v/1e3).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' mil':R(v);};
  const mi=v=>'R$ '+(v/1e6).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mi';
  const D=(x)=>VAZIO?VZ:x;
  $('kpis').innerHTML=`
  <div class="kb-row">
    <div class="kb-head"><span class="kb-l">ARREC x FAT. ACUMULADO <small>${VAZIO?'':'· '+PERIODO}</small></span><span class="kb-v" title="${VAZIO?MSG_VAZIO:`Arrecadado ${R(A)} de faturado ${R(F)}`}">${VAZIO?VZ:`${mi(A)} de ${mi(F)} · <b>${P(p)}</b>`}</span></div>
    <div class="kb-wrap" tabindex="0" data-tip="${VAZIO?MSG_VAZIO:`Arrecadado ${R(A)} de ${R(F)} faturado · faltam ${R(t.falta)} para 100%`}"><div class="kb-track kb-acc" role="img" aria-label="${VAZIO?MSG_VAZIO:`Arrecadado acumulado ${P(p)} do faturado`}"><i class="m2" style="width:${VAZIO?0:Math.min(100,p*100)}%"></i></div></div>
  </div>
  <div class="kb-cards">
    <div class="kb-card fat"><div class="lbl">Faturado do mês${VAZIO?'':' · '+mesLbl}</div><div class="val">${D(R(fm))}</div><div class="note">${VAZIO?MSG_VAZIO:`${nFat} de ${rows.length} matrículas faturadas${PARCIAL?' · mês parcial':''}`}</div></div>
    <div class="kb-card arr"><div class="lbl">Arrecadado do mês${VAZIO?'':' · '+mesLbl}</div><div class="val">${D(R(am))}</div><div class="note">${VAZIO?VZ:`<b>${P(t.pm)}</b> do faturado do mês${t.pm>1?' · inclui faturas anteriores e parcelamentos':''}`}</div></div>
    <div class="kb-card sal"><div class="lbl">Saldo em aberto · saldo de conta</div><div class="val" title="${D(R(S))}">${D(curto(S))}</div><div class="note">${VAZIO?VZ:`parcelado ${curto(t.SP)} · ${N(t.qv)} faturas em aberto · ${N(t.pq)} parcelas futuras`}</div></div>
    <div class="kb-card ven${VAZIO?'':' click'}"${VAZIO?'':' role="button" tabindex="0" aria-haspopup="dialog" data-open="ven" title="Ver as matrículas com saldo vencido"'}><div class="lbl">Saldo vencido · total vencido</div><div class="val" title="${D(R(t.SV))}">${D(curto(t.SV))}</div><div class="note">${VAZIO?VZ:`<b>${P(t.pctSV)}</b> do saldo de conta · ${N(t.nSV)} matrículas com vencido · <span class="go2">ver lista ›</span>`}</div></div>
  </div>
  <div class="kb-foot">
    <span>Matrículas <b>${D(N(rows.length))}</b></span>
    <span${VAZIO?'':' class="click" role="button" tabindex="0" aria-haspopup="dialog" data-open="cad"'}>Atualização cadastral <b>${D(N(t.nCad))}</b>${VAZIO?'':' matrículas ›'}</span>
  </div>`;
  return t;
}

/* ---------- tabelas ---------- */
const vazioTab=msg=>`<tbody><tr><td class="empty">${VAZIO?MSG_VAZIO:msg}</td></tr></tbody>`;
let CLS_DIM='mc';
function tabCls(rows){
  const nm=MONTHS.length||1;
  $('clsTit').textContent=CLS_DIM==='mc'?'Resumo por macro cluster':'Resumo por classificação';
  const {lista:list,T}=C.grupos(rows,CLS_DIM);
  const el=$('tCls');
  if(!list.length){el.innerHTML=vazioTab('Nenhuma matrícula no filtro.');return;}
  el.innerHTML=`<thead><tr><th>${CLS_DIM==='mc'?'Macro cluster':'Classificação'}</th><th class="n">Qtd matrículas</th><th class="n">Economia média</th><th class="n">Fat. médio/mês por matrícula</th><th class="n" title="NFC + NFA, sem parcelas futuras">Faturas em aberto</th><th class="n">Saldo de conta</th><th>% do saldo</th><th class="n">% arrecadado</th></tr></thead><tbody>`+
  list.map(([k,o])=>`<tr class="rclick" data-cl="${esc(k)}" role="button" tabindex="0" aria-haspopup="dialog" title="Ver matrículas de ${esc(k)}"><td><b>${esc(k)}</b> <span class="go">›</span></td><td class="n">${N(o.n)}</td><td class="n">${N1(o.ec/o.n)}</td><td class="n">${R(o.F/o.n/nm)}</td><td class="n">${N(o.q)}</td><td class="n">${R(o.s)}</td><td><div style="display:flex;gap:6px;align-items:center"><div class="bar" style="flex:1"><i style="width:${T.s?o.s/T.s*100:0}%"></i></div><span class="mono">${P(T.s?o.s/T.s:0)}</span></div></td><td class="n ${pctClass(o.F?o.A/o.F:1)}">${P(o.F?o.A/o.F:NaN)}</td></tr>`).join('')+
  `</tbody><tfoot><tr><td>Total</td><td class="n">${N(T.n)}</td><td class="n">${N1(T.ec/T.n)}</td><td class="n">${R(T.F/T.n/nm)}</td><td class="n">${N(T.q)}</td><td class="n">${R(T.s)}</td><td class="mono">100,0%</td><td class="n">${P(T.F?T.A/T.F:NaN)}</td></tr></tfoot>`;
}
let TOP_PR='';
function legendaCriterios(rows){
  rows=rows||filtered(); const tot=rows.length||1;
  const TXT={'CRÍTICA':'% arrecadado < 50% ou saldo vencido ≥ R$ 1 mi','ALTA':'% arrecadado de 50% a 74,9% ou saldo vencido ≥ R$ 300 mil','MÉDIA':'% arrecadado de 75% a 94,9% ou saldo vencido ≥ R$ 100 mil','BAIXA':'% arrecadado ≥ 95%, saldo vencido < R$ 100 mil e mais de 1 fatura não parcelada','REGULAR':'% arrecadado ≥ 95%, saldo vencido < R$ 100 mil e até 1 fatura não parcelada'};
  $('critLeg').innerHTML=`<p><b>Critérios de prioridade:</b> usa o % arrecadado (arrecadado ÷ faturado${VAZIO?'':', '+PERIODO}) e o <b>saldo vencido</b> = saldo de conta – saldo parcelado ("Saldo PARC"). Matrículas que arrecadaram 95% ou mais do faturado nunca ficam acima de MÉDIA.</p><ul>`+
    PRIOS.map(p=>{const n=rows.filter(d=>d.pr===p).length; return `<li><b>${p}</b> (${VAZIO?VZ:`${N(n)} matrículas · ${P(n/tot)}`}): ${TXT[p]}.</li>`;}).join('')+
    `<li>Matrículas com <b>ajuste manual</b> da gestão aparecem com a etiqueta "ajuste manual" na lista de matrículas.</li></ul>`;
}
function tabTop(rows){
  const top=C.topFaturado(rows,TOP_PR,20), el=$('tTop');
  if(!top.length){el.innerHTML=vazioTab('Nenhuma matrícula no filtro.');return;}
  el.innerHTML=`<thead><tr><th class="n">#</th><th>Matrícula</th><th>Cliente</th><th>Município</th><th>Macro cluster</th><th class="n">Faturado</th><th class="n">Arrecadado</th><th class="n">% Arrec.</th><th class="n">Saldo (fat – arr)</th><th class="n">Saldo de conta</th><th class="n" title="NFC + NFA, sem parcelas futuras">Fat. em aberto</th><th>Prioridade</th></tr></thead><tbody>`+
  top.map((d,i)=>`<tr><td class="n">${i+1}</td><td class="mono">${d.m}</td><td class="name" title="${esc(d.n)}">${esc(d.n)}</td><td>${esc(d.c)}</td><td>${esc(mcNome(d.mc))}</td><td class="n">${R(d.F)}</td><td class="n">${R(d.A)}</td><td class="n ${pctClass(d.pct)}">${P(d.pct)}</td><td class="n">${R(d.sa)}</td><td class="n">${R(d.s)}</td><td class="n">${N(d.qv)}</td><td>${pillPr(d)}</td></tr>`).join('')+'</tbody>';
}
function prio(rows){
  const card=p=>{const c=C.cartaoPrio(rows,p);
    if(VAZIO) return `<div class="pc ${p}" title="Critério: ${CRIT[p]}"><div class="pch"><h3>${p}</h3></div><div><span class="big">${VZ}</span> matrículas</div><div><b>${VZ}</b></div><div class="pctm" style="margin:0">parcelado ${VZ} · vencido ${VZ}</div><div class="crit"><b>Critério:</b> ${CRIT[p]}</div><div class="acao"><b>Ação sugerida:</b> ${ACAO[p]}</div></div>`;
    return `<div class="pc ${p}" data-p="${p}" title="Critério: ${CRIT[p]}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Ver as ${c.n} matrículas de prioridade ${p}"><div class="pch"><h3>${p}</h3><button type="button" class="dl" data-dl="${p}" title="Baixar matrículas ${p} em Excel" aria-label="Baixar as ${c.n} matrículas ${p} em Excel">${ICON_DL}</button></div><div><span class="big">${N(c.n)}</span> matrículas <span class="pctm">${P(c.pctN)} do total</span></div><div><b>${R(c.s)}</b> <span class="mono">(${P(c.pctS)})</span></div><div class="pctm" style="margin:0">parcelado ${R(c.sp)} · vencido ${R(c.sv)}</div><div class="crit"><b>Critério:</b> ${CRIT[p]}</div><div class="acao"><b>Ação sugerida:</b> ${ACAO[p]}</div><div class="ver">Ver matrículas ›</div></div>`};
  $('prioTop').innerHTML=PRIOS.slice(0,3).map(card).join('');
  $('prio').innerHTML=PRIOS.slice(3).map(card).join('');
}
function resumo(rows,k){
  const ul=$('resumo');
  if(VAZIO){ul.innerHTML=`<li>${MSG_VAZIO} Clique em <b>Conectar pasta</b> e escolha a pasta com a planilha Top GC 15K. Os dados são lidos só neste navegador.</li>`;return;}
  if(!rows.length){ul.innerHTML='<li>Nenhuma matrícula no filtro selecionado.</li>';return;}
  const r=C.resumoExecutivo(rows), topCl=r.topCl, big=r.big;
  const items=[
    `No período ${PERIODO} foram faturados <b>${R(k.F)}</b> e arrecadados <b>${R(k.A)}</b>, ou seja <b>${P(k.p)}</b> de arrecadação e ${R(k.F-k.A)} de saldo no período.`,
    `O saldo de conta soma <b>${R(k.S)}</b>, dos quais <b>${R(r.SP)}</b> estão parcelados; <b>${r.nCr}</b> matrículas CRÍTICAS concentram <b>${P(k.S?r.sCr/k.S:0)}</b> do saldo (${R(r.sCr)}).`,
    r.nZero?`<b>${r.nZero}</b> matrículas não tiveram nenhuma arrecadação no período, com ${R(r.sZero)} de saldo de conta.`:`Todas as matrículas do filtro tiveram alguma arrecadação no período.`,
    topCl&&big?`A classificação <b>${esc(topCl[0])}</b> é a de maior saldo (${R(topCl[1])}); o maior devedor individual é ${esc(big.n)} (${big.m}), com ${R(big.s)}.`:'',
    r.nSemCart?`<b>${r.nSemCart}</b> matrículas estão sem carteira executiva e somam ${R(r.sSemCart)} de saldo; sem gestor definido, a cobrança dessas contas fica sem responsável.`:''
  ].filter(Boolean);
  ul.innerHTML=items.map(t=>`<li>${t}</li>`).join('');
}
function gaps(){
  const g=C.lacunas(DATA,MONTHS.length), mes=$('refMes').textContent, li=[];
  if(VAZIO) li.push(`${MSG_VAZIO} As observações sobre a base aparecem aqui depois da leitura.`);
  else {
    if(PARCIAL) li.push(`<b>${mes} está parcial:</b> só ${g.nFat} de ${g.n} matrículas têm faturamento lançado no mês. Por isso o arrecadado do mês pode aparecer maior que o faturado do mês (inclui pagamento de faturas anteriores).`);
    if(g.semVenc) li.push(`<b>${g.semVenc} matrículas sem data de vencimento</b> na base (campo vazio/zerado).`);
    if(g.ajustes.length) li.push(`<b>${g.ajustes.length} matrículas com ajuste manual de prioridade</b> informado pela gestão (parcelamento, acordo jurídico ou saldo vencido zerado): ${g.ajustes.map(d=>`${d.m} → ${d.pr}`).join(', ')}. Na lista de matrículas elas aparecem com a etiqueta "ajuste manual".`);
    if(g.semCart) li.push(`<b>${g.semCart} matrículas sem carteira executiva</b>: sem gestor responsável cadastrado.`);
    li.push(`A base tem <b>${g.n} matrículas</b> (recorte Top GC 15K da Leste).`);
  }
  li.push(`"Economia média" = média da coluna QTD ECONOMIA por matrícula. A coluna seguinte mostra o faturamento médio mensal por matrícula.`);
  $('gaps').innerHTML=`<p><b>Prioridade:</b> usa o % arrecadado (arrecadado ÷ faturado${VAZIO?'':', '+PERIODO}) e o <b>saldo vencido</b> = saldo de conta – saldo parcelado ("Saldo PARC"), porque o parcelamento é cobrança futura. Matrículas que arrecadaram 95% ou mais do faturado nunca ficam acima de MÉDIA. O "saldo em aberto" dos cartões é apenas faturado – arrecadado no período; os dois números não se comparam diretamente.</p><ul>${li.map(t=>`<li>${t}</li>`).join('')}</ul>`;
}
const PTC={'Adiantado':'s-acima','Em dia':'s-ok','Atraso leve':'s-parcial','Atrasado':'s-irreg','Atraso grave':'s-parou','Sem pagamento':'s-zero'};
const STATUS={'s-zero':'Sem pagamento no período','s-parou':'Parou de pagar (3+ meses)','s-irreg':'Pagamento irregular','s-parcial':'Pagamento parcial','s-ok':'Em dia','s-acima':'Pagando acima do faturado'};
const LVL={'CRÍTICA':'var(--crit)','ALTA':'var(--alta)','MÉDIA':'var(--media)','BAIXA':'var(--baixa)','REGULAR':'var(--azul-claro)'};
let dRows=[], dSt='', dLvl='', dMode='prio';
const PEND={
  cart:['Sem carteira executiva','Carteira = "Sem Carteira" ou vazia: matrícula sem carteira executiva (gestor responsável).'],
  cort:['Cortada/inativa faturando','Situação da ligação cortada ou inativa, mas com faturamento no mês de referência.'],
  pj:['PJ em categoria residencial','Nome de pessoa jurídica (LTDA, S/A, EIRELI, ME) cadastrado como RESIDENCIAL.']
};
function cad(rows){
  if(VAZIO){$('cad').innerHTML=`<div class="pc cadt"><h3>ATUALIZAÇÃO CADASTRAL</h3><div><span class="big">${VZ}</span> matrículas</div><div><b>${VZ}</b> de saldo de conta</div><div class="crit">${MSG_VAZIO}</div></div>`;return;}
  const r=C.resumoCadastro(rows);
  $('cad').innerHTML=r.n?`<div class="pc cadt" data-k="" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Ver as ${r.n} matrículas com pendência cadastral"><h3>ATUALIZAÇÃO CADASTRAL</h3><div><span class="big">${N(r.n)}</span> matrículas</div><div><b>${R(r.s)}</b> de saldo de conta</div><div class="crit">${r.por.map(([k,n])=>`${N(n)} ${k==='pj'?'PJ em categoria residencial':PEND[k][0].toLowerCase()}`).join(' · ')}</div><div class="ver">Ver matrículas ›</div></div>`
    :'<div class="empty">Nenhuma pendência cadastral no filtro.</div>';
}
function abrirDlg(){const dlg=$('dlg'); if(!dlg.open){ try{dlg.showModal();}catch(e){dlg.setAttribute('open','');} } dlg.scrollTop=0; $('dTabWrap').scrollTop=0;}
function abrirCad(k){
  if(VAZIO) return;
  dMode='cad'; dSt=k||''; $('dBusca').value='';
  dRows=filtered().filter(d=>d.pend.length).sort((a,b)=>b.pend.length-a.pend.length||b.s-a.s);
  const dlg=$('dlg'); dlg.style.setProperty('--lvl','var(--laranja)');
  $('dTit').textContent=`Atualização cadastral · ${N(dRows.length)} matrículas`;
  $('dSub').innerHTML=`Matrículas com ao menos uma pendência de cadastro na base`+(fMun.value?` · ${esc(fMun.value)}`:'');
  const all=filtered(), S=sum(dRows.map(d=>d.s)), ST=sum(all.map(d=>d.s));
  const st=[['Matrículas com pendência',`${N(dRows.length)} de ${N(all.length)}`],['Total de pendências',N(sum(dRows.map(d=>d.pend.length)))],
    ['Saldo de conta dessas matrículas',R(S)],['% do saldo total',P(ST?S/ST:0)],
    ['Sem contar sem carteira executiva',N(dRows.filter(d=>d.pend.some(x=>x!=='cart')).length)+' matrículas'],
    ['Com 2 ou mais pendências',N(dRows.filter(d=>d.pend.length>=2).length)+' matrículas'],
    ['Prioridade CRÍTICA com pendência',N(dRows.filter(d=>d.pr==='CRÍTICA').length)+' matrículas'],
    ['Faturado no mês dessas matrículas',R(sum(dRows.map(d=>d.fm)))]];
  $('dStats').innerHTML=st.map(([l,v])=>`<div class="ds"><div class="l">${l}</div><div class="v">${v}</div></div>`).join('');
  const cnt={}; dRows.forEach(d=>d.pend.forEach(x=>cnt[x]=(cnt[x]||0)+1));
  $('dChips').innerHTML=`<button type="button" class="chip${dSt?'':' on'}" data-k="">Todas (${dRows.length})</button>`+
    Object.keys(PEND).filter(x=>cnt[x]).map(x=>`<button type="button" class="chip${dSt===x?' on':''}" data-k="${x}">${PEND[x][0]} (${cnt[x]})</button>`).join('');
  $('dNote').innerHTML='<b>Regras usadas:</b> '+Object.keys(PEND).map(x=>`<b>${PEND[x][0]}</b>: ${PEND[x][1]}`).join(' ')+' As regras só apontam o que está na base; a correção precisa ser confirmada no sistema comercial.';
  dTabela(); abrirDlg();
}
function cadTabela(){
  const q=$('dBusca').value.trim().toLowerCase();
  const rows=dRows.filter(d=>(!dSt||d.pend.includes(dSt))&&(!q||String(d.m).includes(q)||d.n.toLowerCase().includes(q)));
  const el=$('dTab');
  if(!rows.length){el.innerHTML='<tbody><tr><td class="empty">Nenhuma matrícula com esse filtro.</td></tr></tbody>';return;}
  el.innerHTML=`<thead><tr><th>Matrícula</th><th>Cliente</th><th>Pendências</th><th class="n">Qtd</th><th>Situação</th><th>Categoria / Sub</th><th>Classificação</th><th>Curva / Cluster</th><th>Carteira</th><th>Vencimento</th><th>Município</th><th class="n">Saldo de conta</th><th class="n">Faturado no mês</th><th>Prioridade</th></tr></thead><tbody>`+
  rows.map(d=>`<tr><td class="mono">${d.m}</td><td class="name" title="${esc(d.n)}">${esc(d.n)}</td><td>${d.pend.map(x=>`<span class="tag">${PEND[x][0]}</span>`).join('')}</td><td class="n">${d.pend.length}</td>`+
   `<td>${esc(d.sr||d.sit)}</td><td>${esc(d.cat)}${d.sub&&d.sub!==d.cat?' / '+esc(d.sub):''}</td><td>${esc(d.cl)}</td><td>${esc(d.cur)} / ${esc(d.mc)}</td><td>${esc(d.cart)}</td><td>${d.v||'—'}</td><td>${esc(d.c)}</td>`+
   `<td class="n"><b>${R(d.s)}</b></td><td class="n">${R(d.fm)}</td><td>${pillPr(d)}</td></tr>`).join('')+
  `</tbody><tfoot><tr><td colspan="3">Total (${rows.length})</td><td class="n">${N(sum(rows.map(d=>d.pend.length)))}</td><td colspan="7"></td><td class="n">${R(sum(rows.map(d=>d.s)))}</td><td class="n">${R(sum(rows.map(d=>d.fm)))}</td><td></td></tr></tfoot>`;
}
const mesNome=i=>i<0?'—':`${MESES[i]}/${MONTHS[i].slice(2,4)}`;
function abrirPrio(p,cl,mc,ex){
  if(VAZIO) return;
  dMode=(ex||cl!=null||mc!=null)?'cls':'prio'; dLvl=p; dSt=''; $('dBusca').value='';
  dRows=filtered().filter(d=>ex?ex.fn(d):mc!=null?mcNome(d.mc)===mc:cl!=null?(d.cl||'(sem classificação)')===cl:d.pr===p).sort(ex&&ex.sort?ex.sort:(a,b)=>b.s-a.s);
  const dlg=$('dlg'); dlg.style.setProperty('--lvl',ex?(ex.cor||'var(--azul-claro)'):(cl!=null||mc!=null)?'var(--azul-claro)':LVL[p]);
  $('dTit').textContent=`${ex?ex.titulo:mc!=null?'Macro cluster '+mc:cl!=null?'Classificação '+cl:'Prioridade '+p} · ${N(dRows.length)} matrículas`;
  $('dSub').innerHTML=(ex?ex.sub:mc!=null?`Matrículas do macro cluster ${esc(mc)} · Período ${PERIODO}`:cl!=null?`Matrículas da classificação ${esc(cl)} · Período ${PERIODO}`:`Critério: ${CRIT[p]} · Período ${PERIODO}`)+(fMun.value?` · ${esc(fMun.value)}`:'');
  const s=C.statsDetalhe(dRows);
  const st=[['Faturado',R(s.F)],['Arrecadado',R(s.A)],['% arrecadado',P(s.pct)],['Saldo de conta',R(s.S)],
    ['Saldo parcelado',R(s.sp)],['Saldo vencido (sem parcelamento)',R(s.sv)],
    ['Dia médio de pagamento',s.dmp!=null?'dia '+N1(s.dmp):'—'],
    ['Média dias pagto x vencimento',s.dpv!=null?N1(s.dpv)+' dias':'—']];
  $('dStats').innerHTML=st.map(([l,v])=>`<div class="ds"><div class="l">${l}</div><div class="v">${v}</div></div>`).join('');
  const cnt={}; dRows.forEach(d=>cnt[d.st.k]=(cnt[d.st.k]||0)+1);
  $('dChips').innerHTML=`<button type="button" class="chip on" data-k="">Todos (${dRows.length})</button>`+
    Object.keys(STATUS).filter(k=>cnt[k]).map(k=>`<button type="button" class="chip" data-k="${k}"><span class="sa ${k}"></span>${STATUS[k]} (${cnt[k]})</button>`).join('');
  $('dNote').innerHTML=`<b>Status de arrecadação:</b> Sem pagamento no período (nenhuma arrecadação); Parou de pagar (último pagamento há 3 meses ou mais); Pagamento irregular (&lt; 50% arrecadado); Parcial (50% a 94,9%); Em dia (95% a 101,9%); Acima do faturado (≥ 102%, quitando saldo antigo). `+
    `<b>Barras dos meses:</b> azul = mês com pagamento, salmão = mês faturado sem pagamento. `+
    `<b>Pontualidade:</b> vem da coluna "Status Arrecadação" da planilha (Adiantado, Em dia, Atraso leve, Atrasado, Atraso grave, Sem pagamento), calculada pela média de dias entre pagamento e vencimento. <b>Saldo vencido</b> = saldo de conta – saldo parcelado.`;
  dTabela(); abrirDlg();
}
function dTabela(){
  if(dMode==='cad') return cadTabela();
  const q=$('dBusca').value.trim().toLowerCase();
  const rows=dRows.filter(d=>(!dSt||d.st.k===dSt)&&(!q||String(d.m).includes(q)||d.n.toLowerCase().includes(q)));
  const el=$('dTab');
  if(!rows.length){el.innerHTML='<tbody><tr><td class="empty">Nenhuma matrícula com esse filtro.</td></tr></tbody>';return;}
  el.innerHTML=`<thead><tr><th>Matrícula</th><th>Cliente</th><th>Status de arrecadação</th>${dMode==='cls'?'<th>Prioridade</th>':''}<th>Pontualidade</th><th class="n">Dia médio pagto</th><th class="n">Dias pagto x venc.</th><th>Meses pagantes</th><th>Último pgto</th><th class="n">% Arrec.</th><th class="n">Saldo de conta</th><th class="n">Saldo parcelado</th><th class="n">Saldo vencido</th><th class="n">Faturado</th><th class="n">Arrecadado</th><th class="n">Fat. médio/mês</th><th class="n">Arrec. média/mês pagante</th><th class="n" title="NFC + NFA, sem parcelas futuras">Fat. em aberto</th><th class="n">Dia venc.</th><th>Município</th><th>Classificação</th><th>Carteira</th></tr></thead><tbody>`+
  rows.map(d=>`<tr><td class="mono">${d.m}</td><td class="name" title="${esc(d.n)}">${esc(d.n)}</td><td><span class="sa ${d.st.k}">${d.st.t}</span>${d.aj?` <span class="tag aj" title="${esc(d.aj)}">ajuste manual</span>`:''}</td>${dMode==='cls'?`<td>${pillPr(d)}</td>`:''}<td>${d.pt?`<span class="sa ${PTC[d.pt]||''}">${esc(d.pt)}</span>`:'—'}</td><td class="n">${typeof d.dmp==='number'?d.dmp:'—'}</td><td class="n">${typeof d.dpv==='number'?N1(d.dpv):'—'}</td>`+
   `<td><span class="spark" title="${MESES.map((m,i)=>m+': '+(d.a[i]>0?R(d.a[i]):'sem pagamento')).join(' · ')}">${d.a.map((x,i)=>`<i class="${x>0?'p':(d.f[i]?'n':'')}"></i>`).join('')}</span> <span class="mono">${d.mp}/${MONTHS.length}</span></td>`+
   `<td>${mesNome(d.ult)}</td><td class="n ${pctClass(d.pct)}">${P(d.pct)}</td><td class="n"><b>${R(d.s)}</b></td><td class="n">${R(d.sp)}</td><td class="n">${R(d.sv)}</td><td class="n">${R(d.F)}</td><td class="n">${R(d.A)}</td>`+
   `<td class="n">${R(d.fmm)}</td><td class="n">${R(d.amp)}</td><td class="n">${N(d.qv)}</td><td class="n">${d.vd??'—'}</td><td>${esc(d.c)}</td><td>${esc(d.cl)}</td><td>${esc(d.cart)}</td></tr>`).join('')+
  `</tbody><tfoot><tr><td colspan="${dMode==='cls'?9:8}">Total (${rows.length})</td><td class="n">${P(sum(rows.map(d=>d.F))?sum(rows.map(d=>d.A))/sum(rows.map(d=>d.F)):NaN)}</td><td class="n">${R(sum(rows.map(d=>d.s)))}</td><td class="n">${R(sum(rows.map(d=>d.sp)))}</td><td class="n">${R(sum(rows.map(d=>d.sv)))}</td><td class="n">${R(sum(rows.map(d=>d.F)))}</td><td class="n">${R(sum(rows.map(d=>d.A)))}</td><td colspan="2"></td><td class="n">${N(sum(rows.map(d=>d.qv)))}</td><td colspan="4"></td></tr></tfoot>`;
}
$('dClose').addEventListener('click',()=>{const g=$('dlg');g.close?g.close():g.removeAttribute('open');});
$('dlg').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}});
$('dBusca').addEventListener('input',dTabela);
$('dChips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;dSt=b.dataset.k;[...$('dChips').children].forEach(c=>c.classList.toggle('on',c===b));dTabela();});
$('cad').addEventListener('click',e=>{const c=e.target.closest('.pc[data-k]');if(c)abrirCad(c.dataset.k);});
$('cad').addEventListener('keydown',e=>{const c=e.target.closest('.pc[data-k]');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();abrirCad(c.dataset.k);}});
function abrirVencido(){abrirPrio(null,null,null,{fn:d=>(d.sv||0)>0,sort:(a,b)=>b.sv-a.sv,cor:'var(--crit)',titulo:'Saldo vencido',sub:`Matrículas com saldo vencido (saldo de conta − saldo parcelado), da maior para a menor · Período ${PERIODO}`});}
$('kpis').addEventListener('click',e=>{if(e.target.closest('[data-open="cad"]'))abrirCad('');if(e.target.closest('[data-open="ven"]'))abrirVencido();});
$('kpis').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;if(e.target.closest('[data-open="ven"]')){e.preventDefault();abrirVencido();}else if(e.target.closest('[data-open="cad"]')){e.preventDefault();abrirCad('');}});
$('segPareto').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;PARETO_M=b.dataset.m;[...$('segPareto').children].forEach(x=>x.classList.toggle('on',x===b));charts(filtered());});
const abrirGrupo=k=>CLS_DIM==='mc'?abrirPrio(null,null,k):abrirPrio(null,k);
$('tCls').addEventListener('click',e=>{const r=e.target.closest('tr.rclick');if(r)abrirGrupo(r.dataset.cl);});
$('tCls').addEventListener('keydown',e=>{const r=e.target.closest('tr.rclick');if(r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();abrirGrupo(r.dataset.cl);}});
$('segTop').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;TOP_PR=b.dataset.v;[...$('segTop').children].forEach(x=>x.classList.toggle('on',x===b));tabTop(filtered());});
$('segCls').addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;CLS_DIM=b.dataset.v;[...$('segCls').children].forEach(x=>x.classList.toggle('on',x===b));tabCls(filtered());});
['prio','prioTop'].forEach(id=>$(id).addEventListener('click',e=>{const b=e.target.closest('.dl');if(b){e.stopPropagation();exportPrio(b.dataset.dl,b);}},true));
['prio','prioTop'].forEach(id=>$(id).addEventListener('keydown',e=>{if(e.target.closest('.dl'))e.stopPropagation();},true));
['prio','prioTop'].forEach(id=>$(id).addEventListener('click',e=>{const c=e.target.closest('.pc[data-p]');if(c)abrirPrio(c.dataset.p);}));
['prio','prioTop'].forEach(id=>$(id).addEventListener('keydown',e=>{const c=e.target.closest('.pc[data-p]');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();abrirPrio(c.dataset.p);}}));

/* ---------- downloads (Excel e PDF) — gerados no navegador ---------- */
const ICON_DL='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>';
let DL=null, toastT=0;
function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,4000);}
async function iniciarDL(){ // opcional: só existe quando o painel roda dentro do Claude
  try{DL=window.claude&&window.claude.use?await window.claude.use('downloads'):null;}catch(e){DL=null;}
}
async function salvarArquivo(filename,blob){
  if(DL) return DL.save({filename,data:blob});
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=filename; a.rel='noopener';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {status:'direto'};
}
function avisoSalvo(r,fname){ if(!r) return; if(r.status==='saved') toast(`Arquivo ${fname} salvo.`); else if(r.status==='direto') toast(`Download de ${fname} iniciado.`); }
const semAcento=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'');
function exportPrio(p,btn){
  if(VAZIO){toast(MSG_VAZIO);return;}
  if(!window.XLSX){toast('O leitor de planilhas não carregou. Recarregue a página.');return;}
  const rows=filtered().filter(d=>p==null||d.pr===p).sort(p==null?(a,b)=>b.F-a.F:(a,b)=>b.s-a.s);
  if(!rows.length){toast(p==null?'Nenhuma matrícula no filtro atual.':'Nenhuma matrícula nesse nível com o filtro atual.');return;}
  const nm=MONTHS.length, ult=i=>i<0?'':`${MESES[i]}/${MONTHS[i].slice(0,4)}`;
  const cols=[
    ['Matrícula',d=>d.m,null,12],['Cliente',d=>d.n,null,42],['Município',d=>d.c,null,18],['Bairro',d=>d.b||'',null,18],
    ['Classificação',d=>d.cl||'',null,18],['Categoria',d=>d.cat||'',null,14],['Carteira',d=>d.cart||'',null,18],['Situação',d=>d.sr||d.sit||'',null,12],
    ['Prioridade',d=>d.pr,null,11],['Prioridade calculada',d=>d.prCalc||d.pr,null,12],['Ajuste manual',d=>d.aj||'',null,48],['Status de arrecadação',d=>d.st.t,null,26],
    ['% arrecadado',d=>d.F?d.A/d.F:null,'0.0%',12],[`Faturado ${PERIODO}`,d=>d.F,'#,##0.00',16],[`Arrecadado ${PERIODO}`,d=>d.A,'#,##0.00',16],
    ['Saldo (fat - arr)',d=>d.sa,'#,##0.00',15],['Saldo de conta',d=>d.s,'#,##0.00',16],['Saldo parcelado',d=>d.sp,'#,##0.00',16],['Saldo vencido (sem parcelamento)',d=>d.sv,'#,##0.00',16],['Faturas em aberto (NFC+NFA)',d=>d.qv,'0',12],['Qtd faturas (com parcelas)',d=>d.q,'0',12],['NFC',d=>d.nfc??'',null,7],['NFA',d=>d.nfa??'',null,7],['PARC',d=>d.pq??'',null,7],
    ['Fat. médio/mês',d=>d.fmm,'#,##0.00',14],['Arrec. média/mês pagante',d=>d.amp,'#,##0.00',16],
    ['Meses pagantes',d=>d.mp,'0',10],['Último pagamento',d=>ult(d.ult),null,12],['Dia de vencimento',d=>d.vd??'',null,10],['Pontualidade',d=>d.pt||'',null,14],['Dia médio de pagamento',d=>typeof d.dmp==='number'?d.dmp:'',null,12],['Média dias pagto x venc.',d=>typeof d.dpv==='number'?d.dpv:'',null,12],
    ['Faturado do mês',d=>d.fm??0,'#,##0.00',14],['Arrecadado do mês',d=>d.am??0,'#,##0.00',14],
    ...MONTHS.map((k,i)=>[`Fat ${MESES[i]}/${k.slice(2,4)}`,d=>d.f[i]??null,'#,##0.00',12]),
    ...MONTHS.map((k,i)=>[`Arr ${MESES[i]}/${k.slice(2,4)}`,d=>d.a[i]??null,'#,##0.00',12])
  ];
  const aoa=[cols.map(c=>c[0]),...rows.map(d=>cols.map(c=>{const v=c[1](d);return v==null?'':(typeof v==='number'&&c[2]==='#,##0.00'?Math.round(v*100)/100:v);}))];
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  cols.forEach((c,j)=>{if(!c[2])return;for(let i=1;i<=rows.length;i++){const ref=XLSX.utils.encode_cell({r:i,c:j});if(ws[ref]&&typeof ws[ref].v==='number')ws[ref].z=c[2];}});
  ws['!cols']=cols.map(c=>({wch:c[3]})); ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length,c:cols.length-1}})};
  ws['!freeze']={xSplit:2,ySplit:1};
  const info=[[p==null?'Acompanhamento GC Leste – Base de matrículas':'Acompanhamento GC Leste – Prioridade '+p],[],['Critério',p==null?'Todas as prioridades (ver coluna Prioridade)':CRIT[p]],['Ação sugerida',p==null?'Ver ação por prioridade abaixo':ACAO[p]],['Matrículas',rows.length],
    ['% do total de matrículas',filtered().length?rows.length/filtered().length:0],['Saldo de conta',sum(rows.map(d=>d.s))],
    ['Período',PERIODO],['Mês de referência',$('refMes').textContent],['Filtro município',fMun.value||'Todos'],['Filtro classificação',fCls.value||'Todas'],['Filtro matrícula',fMat.value.trim()||'Todas'],
    ['Fonte',`${META.file} · ${META.origem}`],['Gerado em',dtBR(new Date())],
    ...(p==null?[[],['Prioridade','Matrículas · ação sugerida'],...PRIOS.map(x=>[x,`${rows.filter(d=>d.pr===x).length} · ${ACAO[x]}`])]:[])];
  const wi=XLSX.utils.aoa_to_sheet(info); if(wi.B6)wi.B6.z='0.0%'; if(wi.B7)wi.B7.z='#,##0.00'; wi['!cols']=[{wch:26},{wch:70}];
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Matrículas'); XLSX.utils.book_append_sheet(wb,wi,'Critério');
  const buf=XLSX.write(wb,{type:'array',bookType:'xlsx'});
  const fname=`TopGC_Leste_${p==null?'Base':'Prioridade_'+semAcento(p)}_${MONTHS[nm-1]||''}${SEL.mun.size===1?'_'+semAcento(fMun.value).replace(/[^A-Za-z0-9]+/g,'_'):SEL.mun.size>1?'_'+SEL.mun.size+'_municipios':''}.xlsx`;
  if(btn)btn.disabled=true;
  salvarArquivo(fname,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})).then(r=>avisoSalvo(r,fname))
   .catch(e=>{const c=e&&e.code;if(c==='declined')return;if(c==='rate_limited')toast('Já existe um download aguardando confirmação.');else if(c==='too_large')toast('Arquivo grande demais para baixar aqui.');else toast('Não foi possível baixar o arquivo.');})
   .finally(()=>{if(btn)btn.disabled=VAZIO;});
}

/* ---------- Resumo executivo em PDF (1 página A4) ---------- */
const JSPDF={src:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',integrity:'sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA=='};
function carregarScript(o){return new Promise((res,rej)=>{if(window.jspdf)return res();const s=document.createElement('script');s.src=o.src;s.integrity=o.integrity;s.crossOrigin='anonymous';s.referrerPolicy='no-referrer';s.onload=()=>res();s.onerror=()=>rej(new Error('Não foi possível carregar o gerador de PDF.'));document.head.appendChild(s);});}
const pdfTxt=s=>String(s??'').replace(/[–—]/g,'-').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/[▲]/g,'+').replace(/[▼]/g,'-').replace(/−/g,'-').replace(/[^\x00-\xFF…]/g,'');
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const miPdf=v=>'R$ '+(v/1e6).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mi';
async function gerarResumoPDF(btn){
  if(VAZIO){toast(MSG_VAZIO);return;}
  btn.disabled=true; toast('Gerando o resumo executivo…');
  try{
    await carregarScript(JSPDF);
    const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
    const Co={mar:'#123A7A',az:'#2A60B8',cl:'#4A86D2',tri:'#DCE6EE',pre:'#05050D',mut:'#5b6578',lin:'#d9dee6',soft:'#EEF4F8',lar:'#C2560C',ok:'#1f8a70'};
    const font=(sz,b,c)=>{doc.setFont('helvetica',b?'bold':'normal');doc.setFontSize(sz);doc.setTextColor(...hex(c||Co.pre));};
    const T=(s,x,y,o={})=>{font(o.sz||8,o.b,o.c);doc.text(pdfTxt(s),x,y,{align:o.al||'left',charSpace:o.cs||0});return doc.getTextWidth(pdfTxt(s));};
    const fill=c=>doc.setFillColor(...hex(c)), draw=c=>doc.setDrawColor(...hex(c));
    const rows=filtered(), M=10, W=190;
    const k=C.totais(rows,MONTHS.length), F=k.F, A=k.A, S=k.S, SP=k.SP, SV=k.SV, fm=k.fm, am=k.am, last=MONTHS.length-1, nFat=k.nFat;
    const mesRef=$('refMes').textContent;
    const upd=(META.modificado||'').split(',')[0];
    /* cabeçalho */
    fill(Co.mar); doc.roundedRect(M,M,W,24,2,2,'F');
    const logo=document.querySelector('.logo-box img'); if(logo&&logo.complete&&logo.naturalWidth){try{doc.addImage(logo,'PNG',14,15.6,34,12.1);}catch(e){}}
    draw('#7f9cd0'); doc.setLineWidth(.25); doc.line(52,14,52,30);
    T('ACOMPANHAMENTO GC',55,18.6,{sz:11.5,b:1,c:'#ffffff'}); draw('#7f9cd0'); doc.setLineWidth(.25); doc.line(118,14,118,30); T('LESTE',122,25.2,{sz:20,b:1,c:'#ffffff',cs:.8});
    font(5.6,0,'#c9d6ea'); doc.text(doc.splitTextToSize(pdfTxt('SUPERINTENDÊNCIA LESTE · BASE TOP GC 15K · FATURAMENTO, ARRECADAÇÃO E COBRANÇA'),58),55,23.2);
    T('Mês de referência',196,17,{sz:6.3,c:'#c9d6ea',al:'right'}); T(mesRef,196,22.6,{sz:11,b:1,c:'#ffffff',al:'right'});
    T(`Última atualização: ${upd}`,196,27.6,{sz:6.3,c:'#c9d6ea',al:'right'});
    const lst=(s,todos)=>s.size?(s.size>3?`${s.size} selecionados`:[...s].join(', ')):todos;
    T(`Filtros · Município: ${lst(SEL.mun,'Todos')} · Classificação: ${lst(SEL.cls,'Todas')} · Matrícula: ${lst(SEL.mat,'Todas')} · ${N(rows.length)} matrículas`,M,38.3,{sz:6.6,c:Co.mut});
    /* barras */
    let y=41; draw(Co.lin); doc.setLineWidth(.2); fill('#ffffff'); doc.rect(M,y,W,32,'FD'); fill(Co.mar); doc.rect(M,y,2.6,32,'F');
    const barra=(yy,tit,sub,dir,pct,cor)=>{const tw=T(tit,16,yy,{sz:8.6,b:1,c:Co.mar}); T(sub,16+tw+1,yy,{sz:6.4,c:Co.mut});
      const pw=T(P(pct),196,yy,{sz:10.5,b:1,c:Co.mar,al:'right'}); T(dir,196-pw-1.5,yy,{sz:7,c:Co.mut,al:'right'});
      fill(Co.tri); doc.rect(16,yy+2,180,3.2,'F'); fill(cor); doc.rect(16,yy+2,180*Math.max(0,Math.min(1,pct)),3.2,'F');};
    const pm=k.pm, p=k.p;
    const mesC=`${MESES[last]}/${(MONTHS[last]||'').slice(0,4)}`, cw2=(180-9)/4;
    [[`FATURADO · ${mesC}`,R(fm),`${nFat}/${rows.length}`,Co.mar],[`ARRECADADO · ${mesC}`,R(am),`${P(pm)} do fat.`,Co.cl],['SALDO EM ABERTO',miPdf(S),`parc. ${miPdf(SP)}`,Co.lar],['SALDO VENCIDO',miPdf(SV),`${P(S?SV/S:0)} do saldo`,'#B42318']].forEach(([l,v,nt,cor],kk)=>{
      const x=16+kk*(cw2+3); fill(cor); doc.roundedRect(x,y+12.6,cw2,11,1.2,1.2,'F');
      T(l,x+2.5,y+15.6,{sz:5.2,b:1,c:'#dbe6f6'}); T(v,x+2.5,y+20.8,{sz:9.4,b:1,c:'#ffffff'}); T(nt,x+cw2-2.5,y+15.6,{sz:5.2,c:'#eef4fb',al:'right'});});
    barra(y+5.5,'ARREC x FAT. ACUMULADO',`· ${PERIODO}`,`${miPdf(A)} de ${miPdf(F)} ·`,p,Co.cl);
    draw(Co.tri); doc.line(16,y+25.5,196,y+25.5);
    T(`Matrículas ${N(rows.length)}   ·   Atualização cadastral ${N(k.nCad)} matrículas`,16,y+29.6,{sz:6.4,c:Co.mut});
    /* prioridade */
    y=77; T('PRIORIDADE DE COBRANÇA',M,y,{sz:8.6,b:1,c:Co.mar}); draw(Co.cl); doc.setLineWidth(.35); doc.line(M,y+1.3,M+W,y+1.3);
    y+=3.5; const cw=(W-6)/3, cores={'CRÍTICA':'#B42318','ALTA':'#E8710A','MÉDIA':'#F2B53A'}, totS=S||1;
    ['CRÍTICA','ALTA','MÉDIA'].forEach((pr,i)=>{const x=M+i*(cw+3), c=C.cartaoPrio(rows,pr);
      draw(Co.lin); doc.setLineWidth(.2); fill('#ffffff'); doc.rect(x,y,cw,23,'FD'); fill(cores[pr]); doc.rect(x,y,cw,1.3,'F');
      T(pr,x+3,y+5.6,{sz:8,b:1,c:Co.mar});
      const nw=T(N(c.n),x+3,y+11,{sz:11,b:1,c:Co.mar}); const mw=T(' matrículas',x+3+nw,y+11,{sz:7}); T(`${P(c.pctN)} do total`,x+3+nw+mw+1.5,y+11,{sz:6.4,b:1,c:Co.mut});
      const sw=T(R(c.s),x+3,y+15.6,{sz:8,b:1}); T(`(${P(c.s/totS)})`,x+3+sw+1.2,y+15.6,{sz:6.4,c:Co.mut});
      T(`parcelado ${R(c.sp)} · vencido ${R(c.sv)}`,x+3,y+19.2,{sz:5.6,c:Co.mut});
      const aw=T('Ação:',x+3,y+22,{sz:5.8,b:1}); T(doc.splitTextToSize(pdfTxt(ACAO[pr]),cw-6-aw)[0],x+3+aw+1,y+22,{sz:5.8});});
    /* gráficos */
    y=107; const gw=(W-4)/2;
    const graf=(x,tit,sub,ch,nota)=>{draw(Co.lin); fill('#ffffff'); doc.rect(x,y,gw,72,'FD'); const tw=T(tit,x+3,y+5.2,{sz:8.2,b:1,c:Co.mar}); T(sub,x+3+tw+1.5,y+5.2,{sz:5.8,c:Co.mut}); draw(Co.cl); doc.line(x+3,y+6.6,x+gw-3,y+6.6);
      if(ch){const img=ch.toBase64Image('image/png',1), r=ch.canvas.width/ch.canvas.height; let iw=gw-6, ih=iw/r; const mh=nota?56:61; if(ih>mh){ih=mh;iw=ih*r;} doc.addImage(img,'PNG',x+(gw-iw)/2,y+8,iw,ih);}
      if(nota){font(5.6,0,Co.mut); doc.text(doc.splitTextToSize(pdfTxt(nota),gw-6).slice(0,2),x+3,y+67.6);}};
    graf(M,'FATURAMENTO X ARRECADAÇÃO',`${PERIODO} · Delta vs mês anterior (R$ mi)`,chCol,null);
    {const s=C.serieMensal(rows,MONTHS.length), m=C.mediasMensais(s.f,s.a), bx=M+3, vx=M+gw-3;
     draw(Co.tri); doc.setLineWidth(.2); doc.line(bx,y+57.5,vx,y+57.5);
     [[`Média de arrecadação/mês (${m.nm} meses)`,R(m.mA),Co.cl,y+62],[`Média de faturamento/mês (${m.nm} meses)`,R(m.mF),Co.mar,y+67]].forEach(([l,v,cor,yy])=>{
       fill(cor); doc.circle(bx+1.2,yy-1,1.1,'F'); T(l,bx+3.6,yy,{sz:6.6,c:Co.mut}); T(v,vx,yy,{sz:7.6,b:1,c:Co.mar,al:'right'});});
     T(`arrecadação média: ${P(m.pct)} do faturado`,vx,y+70.6,{sz:5.4,c:Co.mut,al:'right'});}
    graf(M+gw+4,'MACRO CLUSTER',`Pareto 80/20 · ${(document.querySelector('#segPareto .on')||{}).textContent||''}`,chLin,($('paretoNota').innerText||'').replace(' · clique numa barra para ver as matrículas',''));
    /* resumo executivo */
    y=183; const itens=[...document.querySelectorAll('#resumo li')].map(li=>li.innerText); font(6.9,0,'#ffffff');
    const linhas=itens.map(t=>doc.splitTextToSize(pdfTxt(t),W-11)); const hR=9+sum(linhas.map(l=>l.length))*3.15+1;
    fill(Co.mar); doc.roundedRect(M,y,W,hR,1.6,1.6,'F'); T('RESUMO EXECUTIVO',M+3,y+5.4,{sz:8.2,b:1,c:'#ffffff'});
    let yy=y+10; linhas.forEach(l=>{fill('#9fc0ec'); doc.circle(M+4,yy-1,.55,'F'); font(6.9,0,'#ffffff'); doc.text(l,M+6.5,yy); yy+=l.length*3.15;});
    /* tabelas top 5 */
    y=y+hR+4.5;
    const cols=[['#',5,'r'],['Matrícula',14],['Cliente',43],['Município',17],['Macro cluster',19],['Faturado',18,'r'],['Arrecadado',18,'r'],['% Arrec.',11,'r'],['Saldo (fat-arr)',17,'r'],['Saldo de conta',18,'r'],['Faturas',10,'r']];
    const tabela=(tit,lista,cor)=>{T(tit,M,y,{sz:8.2,b:1,c:Co.mar}); draw(cor); doc.setLineWidth(.35); doc.line(M,y+1.3,M+W,y+1.3); y+=2.6;
      fill(Co.mar); doc.rect(M,y,W,4.6,'F'); let x=M; cols.forEach(([h,w,a])=>{T(h,a?x+w-1:x+1,y+3.2,{sz:5.6,b:1,c:'#ffffff',al:a?'right':'left'}); x+=w;}); y+=4.6;
      if(!lista.length){T('Nenhuma matrícula no filtro atual.',M+2,y+3.6,{sz:6.4,c:Co.mut}); y+=5.2; return;}
      lista.forEach((d,i)=>{
        const v=[String(i+1),String(d.m),d.n,d.c,mcNome(d.mc),R(d.F),R(d.A),P(d.pct),R(d.sa),R(d.s),N(d.qv)];
        font(5.9,0); const nomeL=doc.splitTextToSize(pdfTxt(d.n),cols[2][1]-1.6).slice(0,2);
        const rh=Math.max(4.3,1.5+nomeL.length*2.25);
        if(i%2){fill('#f4f6f9'); doc.rect(M,y,W,rh,'F');}
        let x=M;
        cols.forEach(([h,w,a],j)=>{font(5.9,j===9,j===7?(d.pct<.5?'#B42318':d.pct<.95?Co.lar:Co.mar):Co.pre);
          if(j===2){ const y0=y+(rh-nomeL.length*2.25)/2+1.75; nomeL.forEach((l,kk)=>doc.text(l,x+1,y0+kk*2.25)); x+=w; return; }
          let s=pdfTxt(v[j]); while(doc.getTextWidth(s)>w-1.6&&s.length>3) s=s.slice(0,-2)+'…'; if(doc.getTextWidth(s)>w-1.6) s=s.slice(0,-1);
          doc.text(s,a?x+w-1:x+1,y+rh/2+1,{align:a?'right':'left'}); x+=w;});
        draw(Co.lin); doc.setLineWidth(.1); doc.line(M,y+rh,M+W,y+rh); y+=rh;});
      y+=3.4;};
    const crit=rows.filter(d=>d.pr==='CRÍTICA').sort((a,b)=>b.s-a.s).slice(0,5);
    const reg=rows.filter(d=>d.pr==='REGULAR').sort((a,b)=>b.F-a.F).slice(0,5);
    tabela('TOP 5 CRÍTICAS · por saldo de conta',crit,'#B42318');
    tabela('TOP 5 REGULARES · por faturamento',reg,Co.cl);
    T(`Gerado em ${dtBR(new Date())} · Fonte: ${META.file||''} · Período ${PERIODO}`,M,293.5,{sz:5.4,c:Co.mut});
    const fname=`TopGC_Leste_Resumo_Executivo_${MONTHS[last]||''}.pdf`;
    avisoSalvo(await salvarArquivo(fname,doc.output('blob')),fname);
  }catch(e){const c=e&&e.code; if(c==='declined'){} else if(c==='rate_limited') toast('Já existe um download aguardando confirmação.'); else toast(e&&e.message&&!c?e.message:'Não foi possível gerar o resumo.');}
  finally{btn.disabled=VAZIO;}
}
$('btnResumo').addEventListener('click',e=>gerarResumoPDF(e.currentTarget));
$('btnBaseXls').addEventListener('click',e=>exportPrio(null,e.currentTarget));

/* ---------- balão com o motivo da prioridade ---------- */
function motivoPr(d){
  const p=d.pct, s=d.sv||0, q=d.qv||0, pc=P(p), sv=R(s);
  const {raw,travou,pr:calc}=C.classificar(p,s,q);
  const m=[];
  if(raw==='CRÍTICA'){ if(p<0.5) m.push(`% arrecadado de ${pc} (abaixo de 50%)`); if(s>=1e6) m.push(`saldo vencido de ${sv} (≥ R$ 1 mi)`); }
  else if(raw==='ALTA'){ if(p>=0.5&&p<0.75) m.push(`% arrecadado de ${pc} (entre 50% e 74,9%)`); if(s>=3e5) m.push(`saldo vencido de ${sv} (≥ R$ 300 mil)`); }
  else if(raw==='MÉDIA'){ if(p>=0.75&&p<0.95) m.push(`% arrecadado de ${pc} (entre 75% e 94,9%)`); if(s>=1e5) m.push(`saldo vencido de ${sv} (≥ R$ 100 mil)`); }
  else if(raw==='BAIXA'){ m.push(`% arrecadado de ${pc} (≥ 95%)`,`saldo vencido de ${sv} (< R$ 100 mil)`,`${N(q)} faturas em aberto (mais de 1)`); }
  else { m.push(`% arrecadado de ${pc} (≥ 95%)`,`saldo vencido de ${sv} (< R$ 100 mil)`,`${N(q)} fatura${q===1?'':'s'} em aberto (até 1)`); }
  let h=`<b class="tp-h p-${d.pr}">${d.pr}</b><div class="tp-m">${d.m} · ${esc(d.n)}</div><div class="tp-l">Por quê:</div><ul>${m.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  if(travou) h+=`<div class="tp-n">A regra daria <b>${raw}</b>, mas quem arrecadou 95% ou mais fica no máximo em MÉDIA.</div>`;
  if(d.aj) h+=`<div class="tp-n"><b>Ajuste manual:</b> ${esc(AJUSTES[d.m]?.motivo||'')} · pela regra seria <b>${calc}</b>.</div>`;
  return h;
}
const pillPr=d=>`<span class="pill p-${d.pr} tp" tabindex="0" data-m="${d.m}">${d.pr}</span>`;
(function(){
  const tip=document.createElement('div'); tip.id='tipPr'; tip.setAttribute('role','tooltip'); tip.hidden=true; document.body.appendChild(tip);
  const achar=m=>DATA.find(x=>String(x.m)===String(m));
  const mostrar=el=>{const d=achar(el.dataset.m); if(!d) return; tip.innerHTML=motivoPr(d); tip.hidden=false;
    const host=el.closest('dialog')||document.body; if(tip.parentNode!==host) host.appendChild(tip);
    const r=el.getBoundingClientRect(), w=tip.offsetWidth, h=tip.offsetHeight;
    let x=r.left+r.width/2-w/2; x=Math.max(8,Math.min(x,window.innerWidth-w-8));
    let y=r.top-h-10; let emb=false; if(y<8){y=r.bottom+10;emb=true;}
    tip.style.left=x+'px'; tip.style.top=y+'px'; tip.classList.toggle('emb',emb);
    tip.style.setProperty('--ax',(r.left+r.width/2-x)+'px');};
  const esconder=()=>{tip.hidden=true;};
  document.addEventListener('mouseover',e=>{const el=e.target.closest('.pill.tp'); if(el) mostrar(el);});
  document.addEventListener('mouseout',e=>{const el=e.target.closest('.pill.tp'); if(el&&!el.contains(e.relatedTarget)) esconder();});
  document.addEventListener('focusin',e=>{const el=e.target.closest('.pill.tp'); if(el) mostrar(el);});
  document.addEventListener('focusout',e=>{if(e.target.closest('.pill.tp')) esconder();});
  document.addEventListener('click',e=>{const el=e.target.closest('.pill.tp'); if(el){e.stopPropagation(); tip.hidden?mostrar(el):esconder();} else esconder();},true);
  window.addEventListener('scroll',esconder,true);
})();

function render(){
  const rows=filtered(), parts=[];
  const lista=(s,n)=>s.size>3?`${s.size} ${n}`:esc([...s].join(', '));
  if(SEL.mun.size)parts.push('Município: <b>'+lista(SEL.mun,'municípios')+'</b>');
  if(SEL.cls.size)parts.push('Classificação: <b>'+lista(SEL.cls,'classificações')+'</b>');
  if(SEL.mat.size)parts.push('Matrícula: <b>'+lista(SEL.mat,'matrículas')+'</b>');
  $('activeFilter').innerHTML=VAZIO?MSG_VAZIO:(parts.length?parts.join(' · '):'Sem filtro: <b>todas as matrículas da Leste</b>')+` · ${rows.length} matrícula(s)`;
  const k=kpis(rows);charts(rows);tabCls(rows);tabTop(rows);prio(rows);cad(rows);legendaCriterios(rows);resumo(rows,k);
}
$('btnReset').addEventListener('click',()=>{SEL.mun.clear();SEL.cls.clear();SEL.mat.clear();msFechar();msRefresh();render();});

/* ---------- leitura dos arquivos ---------- */
const ehPlanilha=n=>/\.(xlsx|xls)$/i.test(n)&&!n.startsWith('~$')&&!n.startsWith('.');
const ehAjustes=n=>/ajuste/i.test(n);
const MSG_LAYOUT='Nenhuma planilha tem o layout da aba "Top GC 15K". Colunas obrigatórias: Matricula, CIDADE, CLASSIFICACAO, as colunas de meses (cabeçalho com data), Total Geral (depois do faturamento), as colunas de meses da arrecadação, Total Geral (depois da arrecadação), QTD faturas e Saldo de Conta.';
function lerPlanilha(buf){
  if(!window.XLSX) throw new Error('O leitor de planilhas não carregou. Verifique a conexão e recarregue a página.');
  return XLSX.read(buf,{type:'array',cellDates:false});
}
const matriz=ws=>XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
/** Base: primeira aba com o cabeçalho Matricula + Saldo de Conta (mesma regra do original). */
function lerBase(wb){
  let lastErr=null;
  for(const name of wb.SheetNames){
    try{const r=C.lerAba(matriz(wb.Sheets[name])); if(r){r.sheet=name; return r;}}catch(e){lastErr=e;}
  }
  if(lastErr) throw lastErr;
  return null;
}
function lerArqAjustes(wb){
  for(const name of wb.SheetNames){const r=C.lerAjustes(matriz(wb.Sheets[name])); if(r) return r;}
  throw new Error('não tem uma aba com as colunas Matricula, Prioridade, Motivo e Data.');
}
/**
 * Recebe a lista de arquivos (da pasta ou escolhidos) e monta a base.
 * cands: [{name, path, get:()=>Promise<File>}]
 */
async function carregarArquivos(cands,origem,novoModo){
  const files=[];
  for(const c of cands){try{const f=await c.get();files.push({c,f});}catch(e){}}
  if(!files.length) throw new Error(`Nenhuma planilha (.xlsx ou .xls) encontrada em ${esc(origem.nome)} (incluindo subpastas).`);
  const aj=files.filter(x=>ehAjustes(x.c.name)).sort((a,b)=>b.f.lastModified-a.f.lastModified);
  const base=files.filter(x=>!ehAjustes(x.c.name));
  // base: prioriza nomes com 15K/GC/TOP/LEST e depois o arquivo mais novo
  const score=n=>(/15k/i.test(n)?4:0)+(/\bgc\b|gc[_\s-]|top/i.test(n)?2:0)+(/lest/i.test(n)?1:0);
  base.sort((x,y)=>score(y.c.name)-score(x.c.name)||y.f.lastModified-x.f.lastModified);
  const tentados=[]; let r=null, usado=null;
  for(const x of base.slice(0,25)){
    if(x.f.size>60e6){tentados.push(`${x.c.path}: arquivo acima de 60 MB`);continue;}
    try{ r=lerBase(lerPlanilha(await x.f.arrayBuffer())); if(r){usado=x;break;} tentados.push(`${x.c.path}: nenhuma aba com as colunas Matricula e Saldo de Conta`); }
    catch(e){tentados.push(`${x.c.path}: ${e.message}`);}
  }
  if(!r) throw new Error(MSG_LAYOUT+(tentados.length?'<ul>'+tentados.slice(0,5).map(t=>`<li>${esc(t)}</li>`).join('')+'</ul>':''));
  // ajustes manuais (opcional)
  let ajustes={}, ajInfo=null, ajErro=null;
  if(aj.length){
    try{const a=lerArqAjustes(lerPlanilha(await aj[0].f.arrayBuffer())); ajustes=a.ajustes; ajInfo={file:aj[0].c.path,n:a.n,modificado:dtBR(new Date(aj[0].f.lastModified))};}
    catch(e){ajErro=`${aj[0].c.path}: ${e.message}`;}
  }
  const meta={origem:origem.rotulo,pasta:origem.nome,file:usado.c.path,sheet:r.sheet,modificado:dtBR(new Date(usado.f.lastModified)),carregado:dtBR(new Date()),
    ajustes:ajInfo,ajErro,faltamOpcionais:r.faltamOpcionais,ignorados:files.filter(x=>x!==usado&&x!==aj[0]).map(x=>x.c.path)};
  modo=novoModo;
  prep({months:r.months,rows:r.rows,ajustes,meta});
  return r;
}

/* ---------- conexão da pasta ---------- */
// Guarda só a referência da última pasta (sem conteúdo), no IndexedDB deste navegador.
const idb={
  open(){return new Promise((res,rej)=>{const r=indexedDB.open('topgc_leste',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});},
  async get(k){try{const db=await this.open();return await new Promise((res,rej)=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}catch(e){return undefined;}},
  async set(k,v){try{const db=await this.open();await new Promise((res,rej)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error);});}catch(e){}},
  async del(k){try{const db=await this.open();await new Promise(res=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=res;t.onerror=res;});}catch(e){}}
};
let pasta=null, pastaPendente=false, modo=null; // modo: 'pasta' | 'lista'
function msg(t,tipo){const m=$('srcMsg');m.hidden=!t;m.className='msg'+(tipo?' '+tipo:'');m.innerHTML=t||'';}
function busy(b){['btnPasta','btnArquivo','btnRecarregar','btnDesconectar'].forEach(id=>$(id).disabled=b);}
function status(){
  const m=META, el=$('srcStatus'), info=$('srcInfo');
  const conectado=!VAZIO;
  if(conectado){
    el.innerHTML=`<span title="Dados carregados" class="dot ok"></span>Última atualização: <b>${esc(m.modificado)}</b>`;
    el.title=`${m.file}${m.sheet?' (aba '+m.sheet+')':''} · carregado em ${m.carregado}`;
    const lin=[`<b>${modo==='pasta'||modo==='input'?'Pasta':'Origem'}:</b> ${esc(m.pasta)} · <b>carregado em</b> ${esc(m.carregado)}`,
      `<b>Base:</b> ${esc(m.file)} (aba "${esc(m.sheet)}", modificado em ${esc(m.modificado)}) · ${N(DATA.length)} matrículas, ${MONTHS.length} meses`,
      m.ajustes?`<b>Ajustes manuais:</b> ${esc(m.ajustes.file)} · ${N(m.ajustes.n)} matrícula(s)`:m.ajErro?`<b>Ajustes manuais:</b> arquivo com erro, não aplicado (veja o aviso abaixo)`:`<b>Ajustes manuais:</b> nenhum arquivo ajustes.xlsx encontrado`];
    if(m.ignorados&&m.ignorados.length) lin.push(`<b>Outros arquivos (não usados):</b> ${m.ignorados.slice(0,6).map(esc).join(', ')}${m.ignorados.length>6?` e mais ${m.ignorados.length-6}`:''}`);
    info.className='msg info'; info.innerHTML=lin.join('<br>'); info.hidden=false;
  } else if(pasta&&pastaPendente){
    el.innerHTML=`<span class="dot warn"></span>Última pasta: <b>${esc(pasta.name)}</b> · clique em <b>Recarregar</b> para permitir a leitura`; el.title='';
    info.hidden=true;
  } else {
    el.innerHTML=`<span class="dot warn"></span><b>${MSG_VAZIO}</b> Clique em <b>Conectar pasta</b> e escolha a pasta com a planilha Top GC 15K.`; el.title='Os dados são lidos só neste navegador e não são enviados para nenhum lugar.';
    info.hidden=true;
  }
  const tem=conectado||!!pasta;
  $('btnRecarregar').hidden=!tem; $('btnDesconectar').hidden=!tem;
  $('btnPasta').textContent=tem?'Trocar pasta':'Conectar pasta';
}
function avisos(){
  const m=META, a=[];
  if(m.ajErro) a.push(`<b>Ajustes manuais não aplicados</b> — ${esc(m.ajErro)}`);
  if(m.faltamOpcionais&&m.faltamOpcionais.length) a.push(`Colunas opcionais ausentes (os campos ficam vazios ou zerados): ${m.faltamOpcionais.map(esc).join(', ')}.`);
  if(!m.ajustes&&!m.ajErro) a.push('Nenhum arquivo de ajustes manuais (ajustes.xlsx) na pasta: prioridades só pela regra.');
  msg(a.length?a.join('<br>'):'', a.length?'warn':'');
}
async function lerPasta(){
  busy(true); msg('Lendo a pasta…');
  try{const c=[];for await (const x of walk(pasta)) c.push(x); await carregarArquivos(c,{rotulo:'Pasta '+pasta.name,nome:pasta.name},'pasta'); avisos();}
  catch(e){msg(e.message,'err');}
  finally{busy(false); status();}
}
async function* walk(dir,depth=0,path=''){
  for await (const [name,h] of dir.entries()){
    if(name.startsWith('.'))continue;
    if(h.kind==='directory'){if(depth<6) yield* walk(h,depth+1,path+name+'/');}
    else if(ehPlanilha(name)) yield {name,path:path+name,get:()=>h.getFile()};
  }
}
async function permitir(h){
  if(await h.queryPermission({mode:'read'})==='granted') return true;
  return await h.requestPermission({mode:'read'})==='granted';
}
$('btnPasta').addEventListener('click',async()=>{
  if(!window.showDirectoryPicker){ $('inDir').click(); return; }
  try{
    const h=await window.showDirectoryPicker({id:'topgc_leste',mode:'read'});
    pasta=h; pastaPendente=false; await idb.set('pasta',h); await lerPasta();
  }catch(e){
    if(e.name==='AbortError') return;
    $('inDir').click(); // navegador sem permissão para o seletor: usa o modo alternativo (só leitura)
  }
});
$('btnRecarregar').addEventListener('click',async()=>{
  if(pasta){ try{ if(!await permitir(pasta)){msg('Permissão de leitura negada para a pasta.','err');return;} }catch(e){msg('Não foi possível acessar a pasta. Conecte de novo.','err');return;} pastaPendente=false; return lerPasta(); }
  if(modo==='input') return $('inDir').click();
  if(modo==='lista') return $('inFile').click();
});
$('btnDesconectar').addEventListener('click',async()=>{
  pasta=null; pastaPendente=false; modo=null; await idb.del('pasta');
  SEL.mun.clear(); SEL.cls.clear(); SEL.mat.clear(); msFechar();
  const dlg=$('dlg'); if(dlg.open) dlg.close();
  prep(VAZIO_DS); msg('Pasta desconectada. Nenhum dado ficou guardado neste navegador.');
});
$('inDir').addEventListener('change',async e=>{
  const all=[...e.target.files];
  const fl=all.filter(f=>ehPlanilha(f.name)&&(f.webkitRelativePath||'').split('/').length<=8);
  const raiz=(all[0]?.webkitRelativePath||'').split('/')[0]||'pasta';
  if(!all.length) return;
  pasta=null; pastaPendente=false; await idb.del('pasta');
  busy(true); msg('Lendo a pasta…');
  try{await carregarArquivos(fl.map(f=>({name:f.name,path:f.webkitRelativePath||f.name,get:async()=>f})),{rotulo:'Pasta '+raiz,nome:raiz},'input'); avisos();}
  catch(err){msg(err.message,'err');} finally{busy(false); status(); e.target.value='';}
});
$('btnArquivo').addEventListener('click',()=>$('inFile').click());
$('inFile').addEventListener('change',async e=>{
  const fl=[...e.target.files].filter(f=>ehPlanilha(f.name)); if(!e.target.files.length) return;
  pasta=null; pastaPendente=false; await idb.del('pasta');
  busy(true); msg('Lendo a planilha…');
  try{await carregarArquivos(fl.map(f=>({name:f.name,path:f.name,get:async()=>f})),{rotulo:'Arquivo',nome:fl.length===1?fl[0].name:`${fl.length} arquivos escolhidos`},'lista'); avisos();}
  catch(err){msg(err.message,'err');} finally{busy(false); status(); e.target.value='';}
});

/* ---------- inicialização: abre vazio ---------- */
prep(VAZIO_DS);
iniciarDL();
if(!window.Chart||!window.XLSX) msg('Não foi possível carregar as bibliotecas do painel (gráficos/planilhas). Verifique a conexão com a internet e recarregue a página.','err');
(async()=>{
  await idb.del('dados_v2'); // limpa a cópia da base salva por versões antigas, se existir
  const h=await idb.get('pasta');
  if(h&&h.queryPermission){
    pasta=h;
    try{
      if(await h.queryPermission({mode:'read'})==='granted') await lerPasta();
      else {pastaPendente=true; status();}
    }catch(e){pasta=null; status();}
  }
})();
