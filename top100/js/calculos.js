/*!
 * Top GC Interior Lagos — cálculos (funções puras, sem interface)
 * Mesma lógica da versão original. Ver docs/CALCULOS-TOP100.md.
 * Funciona no navegador (window.Calculos) e no Node (module.exports), para testes.
 * As planilhas chegam como matrizes de células (linhas x colunas, valores crus do Excel).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Calculos = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PRIOS = ['CRÍTICA', 'ALTA', 'MÉDIA', 'BAIXA', 'REGULAR'];
  const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const NOMES_MES_LONGO = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

  /* ---------- utilitários ---------- */
  const sum = a => a.reduce((x, y) => x + (y || 0), 0);
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  const serialYM = v => { if (typeof v !== 'number' || v < 20000 || v > 80000) return null; const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
  const serialBR = v => { if (typeof v !== 'number' || v < 1000) return null; const d = new Date(Math.round((v - 25569) * 864e5)); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear(); };
  const num = v => { if (v == null || v === '') return null; if (typeof v === 'number') return Math.round(v * 100) / 100; const t = String(v).replace(/[R$\s.]/g, '').replace(',', '.'); const n = parseFloat(t); return isFinite(n) ? Math.round(n * 100) / 100 : null; };
  const mcNome = x => { const s = String(x ?? '').trim(); return (!s || s === '-') ? '(não informado)' : s.replace(/^\d+\.\s*/, ''); };
  const clsDe = d => d.cl || '(sem classificação)';

  /* ---------- leitura da aba "Top GC" ---------- */
  const OPCIONAIS = [['CLIENTE', 'CLIENTE'], ['UTILIZACAO', 'UTILIZAÇÃO'], ['CATEGORIA', 'CATEGORIA'], ['SUB-CATEGORIA', 'SUB-CATEGORIA'], ['QTD ECONOMIA', 'QTD ECONOMIA'], ['SIT_LIGACAO', 'SIT_LIGAÇÃO'],
    ['CARTEIRA', 'CARTEIRA'], ['MACROCLUSTER.CURVA CLIENTE', 'MACROCLUSTER.CURVA CLIENTE'], ['MACROCLUSTER.MACRO CLUSTER', 'MACROCLUSTER.MACRO CLUSTER'], ['DATA LEITURA', 'DATA LEITURA'],
    ['NFC', 'NFC'], ['NFA', 'NFA'], ['PARC', 'PARC'], ['SALDO PARC', 'SALDO PARC'], ['VENCIMENTO', 'VENCIMENTO'], ['MEDIA DIAS PAGAMENTO', 'MÉDIA DIAS PAGAMENTO'], ['STATUS', 'STATUS'], ['ACAO', 'AÇÃO']];

  /**
   * Lê a matriz da aba "Top GC". Retorna null se não tiver o cabeçalho; lança erro se faltar coluna obrigatória.
   * anoAtual: ano usado quando a coluna DATA LEITURA não existir (o original usava o ano do relógio).
   */
  function lerAba(A, anoAtual) {
    let h = -1;
    for (let i = 0; i < Math.min(15, A.length); i++) { const r = (A[i] || []).map(norm); if (r.includes('MATRICULA') && (r.includes('TOTAL VENCIDO') || r.includes('SALDO TOTAL') || r.includes('SALDO VENCIDO'))) { h = i; break; } }
    if (h < 0) return null;
    const H = A[h].map(norm), ix = name => H.indexOf(name);
    const iM = ix('MATRICULA'), iN = ix('CLIENTE'), iCl = ix('CLASSIFICACAO'), iU = ix('UTILIZACAO'), iCat = ix('CATEGORIA'), iSub = ix('SUB-CATEGORIA'), iEc = ix('QTD ECONOMIA'), iSit = ix('SIT_LIGACAO'),
      iCart = ix('CARTEIRA'), iCur = ix('MACROCLUSTER.CURVA CLIENTE'), iMc = ix('MACROCLUSTER.MACRO CLUSTER'), iC = ix('CIDADE'), iDL = ix('DATA LEITURA'), iVP = ix('VALOR PAGO'), iRP = ix('REF. PAGA'),
      iNfc = ix('NFC'), iNfa = ix('NFA'), iPq = ix('PARC'), iSp = ix('SALDO PARC'), iTV = [ix('SALDO VENCIDO'), ix('SALDO TOTAL'), ix('TOTAL VENCIDO')].find(i => i >= 0) ?? -1, iV = ix('VENCIMENTO'), iMD = ix('MEDIA DIAS PAGAMENTO'), iSt = ix('STATUS'), iAc = ix('ACAO'), iTd = ix('TIPO DOCUMENTO');
    const ST = H[iTV] === 'SALDO TOTAL', SVC = H[iTV] === 'SALDO VENCIDO';
    const fCols = [], aCols = [];
    H.forEach((t, i) => { let m = t.match(/^FAT\.?\s*REF\.?\s*(\d{1,2})$/); if (m) fCols[+m[1] - 1] = i; m = t.match(/^ARREC\.?\s*REF\.?\s*(\d{1,2})$/); if (m) aCols[+m[1] - 1] = i; });
    const falta = [['MATRICULA', iM], ['CIDADE', iC], ['CLASSIFICAÇÃO', iCl], ['TOTAL VENCIDO / SALDO VENCIDO / SALDO TOTAL', iTV], ['FAT. REF.01', fCols[0] ?? -1], ['Arrec Ref.01', aCols[0] ?? -1]].filter(x => x[1] < 0).map(x => x[0]);
    if (falta.length) throw new Error('Colunas não encontradas: ' + falta.join(', '));
    const anos = {}; for (let r = h + 1; r < A.length; r++) { const k = serialYM((A[r] || [])[iDL]); if (k) anos[k.slice(0, 4)] = (anos[k.slice(0, 4)] || 0) + 1; }
    const ano = Object.entries(anos).sort((a, b) => b[1] - a[1])[0]?.[0] || String(anoAtual);
    const nM = Math.max(fCols.length, aCols.length), str = v => v == null || String(v).trim() === '' ? null : String(v).trim(), g = (L, i) => i >= 0 ? L[i] : null;
    const rows = [];
    for (let r = h + 1; r < A.length; r++) {
      const L = A[r] || []; const m = L[iM];
      if (m == null || !/^\d{5,}$/.test(String(m).trim())) continue;
      const md = num(g(L, iMD)), sp = num(g(L, iSp)) || 0, x = num(L[iTV]) || 0, tv = ST ? Math.max(0, Math.round((x - sp) * 100) / 100) : x, nfc = num(g(L, iNfc)), nfa = num(g(L, iNfa)), pq = num(g(L, iPq)), sit = str(g(L, iSit));
      rows.push({
        m: +String(m).trim(), n: String(L[iN] ?? '').trim(), cat: str(g(L, iCat)), sub: str(g(L, iSub)), u: str(g(L, iU)), td: str(g(L, iTd)), cl: str(L[iCl]), ec: num(g(L, iEc)) || 0,
        sit: sit ? sit.charAt(0) + sit.slice(1).toLowerCase() : '', sr: sit, cart: str(g(L, iCart)), cur: str(g(L, iCur)), mc: str(g(L, iMc)), b: null, c: str(L[iC]) || '(sem município)', v: iV >= 0 ? serialBR(L[iV]) : null,
        f: [...Array(nM)].map((_, k) => fCols[k] != null ? (num(L[fCols[k]]) || 0) : 0), a: [...Array(nM)].map((_, k) => aCols[k] != null ? (num(L[aCols[k]]) || 0) : 0),
        q: (nfc || 0) + (nfa || 0) + (pq || 0), tv, svc: SVC, st: ST ? x : null, av: null, s: ST ? x : Math.round((tv + sp) * 100) / 100, nfc, nfa, pq, sp, dmp: null, dpv: md == null ? null : Math.round(md * 10) / 10,
        pt: str(g(L, iSt)), ac: str(g(L, iAc)), vp: num(g(L, iVP)), rp: iRP >= 0 ? serialYM(L[iRP]) : null
      });
    }
    if (!rows.length) throw new Error('A aba foi encontrada, mas não tem matrículas.');
    let last = nM - 1;
    while (last > 0 && rows.every(d => !d.f[last] && !d.a[last])) last--;
    rows.forEach(d => { d.f = d.f.slice(0, last + 1); d.a = d.a.slice(0, last + 1); d.fm = d.f[last]; d.am = d.a[last]; });
    const faltamOpcionais = OPCIONAIS.filter(([k]) => !H.includes(k)).map(x => x[1]);
    return { months: [...Array(last + 1)].map((_, k) => `${ano}-${String(k + 1).padStart(2, '0')}`), rows, ano, faltamOpcionais };
  }

  /**
   * Complementa com "Base Fat2" (bairro e faturas), "Base Arrecadação" (dia médio de pagamento e pagamentos) e "Base Saldo" (saldo total).
   * abas: {nomes:[nomes das abas], matriz:(nome)=>matriz}. hoje: data de hoje em série Excel (usada só se não houver pagamentos).
   * Altera res.rows. Retorna a lista de abas usadas.
   */
  function enriquecer(abas, res, hoje) {
    const usadas = [];
    const byM = new Map(res.rows.map(d => [String(d.m), d])), acha = re => abas.nomes.find(n => re.test(norm(n)));
    const nf = acha(/^BASE FAT/), fatR = {}, payR = {}; let lastP = 0;
    if (nf) { usadas.push(nf); const A = abas.matriz(nf); const H = (A[0] || []).map(norm), iL = H.indexOf('N. DA LIGACAO'), iB = H.indexOf('NOME DO BAIRRO'), iRef = H.indexOf('REFERENCIA DE LEITURA'), iVal = H.indexOf('VALOR PARCELA'), iDv = H.indexOf('DATA DE VENCIMENTO');
      if (iL >= 0) for (let r = 1; r < A.length; r++) { const L = A[r] || [], k = String(L[iL] ?? '').trim(), d = byM.get(k); if (!d) continue; if (iB >= 0 && d.b == null) d.b = L[iB];
        if (iRef >= 0 && iVal >= 0 && L[iRef] != null) { const e = ((fatR[k] ??= {})[String(L[iRef]).trim()] ??= { v: 0, dv: null }); e.v += +L[iVal] || 0; if (typeof L[iDv] === 'number') e.dv = L[iDv]; } } }
    const na = acha(/^BASE ARRECADA/);
    if (na) { usadas.push(na); const A = abas.matriz(na); const H = (A[0] || []).map(norm), iL = H.findIndex(t => /LIGACAO/.test(t)), iD = H.indexOf('DATA PAGTO.');
      const iVp = H.indexOf('VALOR PAGO'), iRp = H.indexOf('REF. PAGA');
      for (let r = 1; r < A.length; r++) { const L = A[r] || [], k = String(L[iL] ?? '').trim(); if (typeof L[iD] === 'number' && L[iD] > lastP) lastP = L[iD];
        if (byM.has(k) && iRp >= 0 && typeof L[iRp] === 'number') { const ym = serialYM(L[iRp]); const ref = ym.slice(5) + '/' + ym.slice(0, 4); (payR[k] ??= {})[ref] = ((payR[k] || {})[ref] || 0) + (+L[iVp] || 0); } }
      if (iL >= 0 && iD >= 0) { const ac = {}; for (let r = 1; r < A.length; r++) { const L = A[r] || [], k = String(L[iL] ?? '').trim(), v = L[iD]; if (!byM.has(k) || typeof v !== 'number') continue;
        const dt = new Date(Math.round((v - 25569) * 864e5)); if (String(dt.getUTCFullYear()) !== res.ano) continue; (ac[k] ??= []).push(dt.getUTCDate()); }
        Object.entries(ac).forEach(([k, l]) => { byM.get(k).dmp = Math.floor(sum(l) / l.length * 10 + 0.5) / 10; }); } }
    /* saldo total da "Base Saldo" separado em parcelado, a vencer e vencido (faturas vencidas sem pagamento registrado) */
    if (Object.keys(fatR).length) { const base = lastP ? Math.floor(lastP) + 1 : hoje, r2 = v => Math.floor(v * 100 + 0.5) / 100;
      const nbs = acha(/^BASE SALDO/); if (nbs) { usadas.push(nbs); const A = abas.matriz(nbs); const H = (A[0] || []).map(norm), iT = H.indexOf('SALDO TOTAL'), iL = iT > 0 ? iT - 1 : -1;
        if (iT > 0) for (let r = 1; r < A.length; r++) { const L = A[r] || [], d = byM.get(String(L[iL] ?? '').trim()); if (d && d.svc) d.st = num(L[iT]) || 0; } }
      res.rows.forEach(d => { if (d.st == null && !d.svc) return; const k = String(d.m); let av = 0, ov = 0;
        Object.entries(fatR[k] || {}).forEach(([ref, e]) => { const p = (payR[k] || {})[ref] || 0; if (e.dv == null || p >= 0.99 * e.v) return; if (e.dv >= base) av += e.v; else ov += e.v - p; });
        if (d.svc) { d.av = r2(d.st != null ? Math.min(av, Math.max(0, d.st - d.sp - d.tv)) : av); d.s = r2(d.sp + d.av + d.tv); return; }
        const nao = Math.max(0, d.st - d.sp); d.av = r2(Math.min(av, nao)); d.tv = r2(Math.min(Math.max(0, nao - av), ov)); d.s = r2(d.sp + d.av + d.tv); }); }
    return usadas;
  }

  /* ---------- arquivo de ajustes manuais (ajustes.xlsx na pasta de dados) ---------- */
  const PRIO_NORM = Object.fromEntries(PRIOS.map(p => [norm(p), p]));
  function lerAjustes(A) {
    let h = -1;
    for (let i = 0; i < Math.min(10, A.length); i++) { const r = (A[i] || []).map(norm); if (r.includes('MATRICULA') && r.includes('PRIORIDADE')) { h = i; break; } }
    if (h < 0) return null;
    const H = A[h].map(norm), ix = k => H.indexOf(k);
    const falta = ['MATRICULA', 'PRIORIDADE', 'MOTIVO', 'DATA'].filter(k => ix(k) < 0);
    if (falta.length) throw new Error('Arquivo de ajustes sem as colunas: ' + falta.map(k => ({ MATRICULA: 'Matricula', PRIORIDADE: 'Prioridade', MOTIVO: 'Motivo', DATA: 'Data' }[k])).join(', '));
    const ajustes = {}, erros = [];
    for (let r = h + 1; r < A.length; r++) {
      const L = A[r] || [];
      if (L.every(x => x == null || String(x).trim() === '')) continue;
      const m = String(L[ix('MATRICULA')] ?? '').trim(), p = PRIO_NORM[norm(L[ix('PRIORIDADE')])];
      const dt = L[ix('DATA')], data = typeof dt === 'number' ? serialBR(dt) : String(dt ?? '').trim();
      if (!/^\d{5,}$/.test(m)) { erros.push(`linha ${r + 1}: matrícula inválida`); continue; }
      if (!p) { erros.push(`linha ${r + 1}: prioridade "${L[ix('PRIORIDADE')] ?? ''}" inválida (use ${PRIOS.join(', ')})`); continue; }
      ajustes[+m] = { pr: p, motivo: String(L[ix('MOTIVO')] ?? '').trim(), data };
    }
    if (erros.length) throw new Error('Arquivo de ajustes com problemas: ' + erros.slice(0, 5).join('; ') + (erros.length > 5 ? ` (+${erros.length - 5})` : ''));
    return { ajustes, n: Object.keys(ajustes).length };
  }

  /* ---------- regras por matrícula ---------- */
  function classificar(p, s, qv) {
    const raw = (p < 0.5 || s >= 1e6) ? 'CRÍTICA' : (p < 0.75 || s >= 3e5) ? 'ALTA' : (p < 0.95 || s >= 1e5) ? 'MÉDIA' : (s > 0 && qv > 1) ? 'BAIXA' : 'REGULAR';
    const travou = p >= 0.95 && (raw === 'CRÍTICA' || raw === 'ALTA');
    return { raw, pr: travou ? 'MÉDIA' : raw, travou };
  }
  function statusArr(d) {
    if (!d.A) return { k: 's-zero', t: 'Sem pagamento no período' };
    if (d.semPagar >= 3) return { k: 's-parou', t: `Parou de pagar há ${d.semPagar} meses` };
    if (d.pct >= 1.02) return { k: 's-acima', t: 'Pagando acima do faturado' };
    if (d.pct >= 0.95) return { k: 's-ok', t: 'Em dia' };
    if (d.pct >= 0.5) return { k: 's-parcial', t: 'Pagamento parcial' };
    return { k: 's-irreg', t: 'Pagamento irregular' };
  }
  /** Pendências cadastrais exibidas: cart, cort, pj. */
  function pendencias(d) {
    const p = [], last = d.f.length - 1, sitN = norm(d.sr || d.sit), c = norm(d.cat);
    if (!d.cart || norm(d.cart) === 'SEM CARTEIRA') p.push('cart');
    if (sitN && !sitN.startsWith('A') && (d.f[last] || 0) > 0) p.push('cort');
    if (c === 'RESIDENCIAL' && /\b(LTDA|S\/A|S\.A\.?|EIRELI|ME|EPP)\b/i.test(d.n || '') && !/CONDOMINIO/i.test(d.n || '')) p.push('pj');
    return p;
  }
  /** Campos derivados, prioridade, status, pendências, período e mês parcial. Não altera as linhas recebidas. */
  /* Filtro de mês: mantém só os meses marcados no faturamento/arrecadação (saldos são posição atual e não mudam).
     Os valores "do mês" passam a ser os do último mês marcado. Sem meses marcados, devolve a base inteira. */
  function recortarMeses(ds, meses) {
    if (!meses || !meses.size) return ds;
    const idx = ds.months.map((k, i) => meses.has(k) ? i : -1).filter(i => i >= 0);
    if (!idx.length) return ds;
    const li = idx[idx.length - 1];
    return { ...ds, months: idx.map(i => ds.months[i]),
      rows: ds.rows.map(d => ({ ...d, f: idx.map(i => d.f[i]), a: idx.map(i => d.a[i]), fm: d.f[li] || 0, am: d.a[li] || 0 })) };
  }
  function nomePeriodo(MONTHS, todos) {
    if (!MONTHS.length) return '';
    const MESES = MONTHS.map(k => NOMES_MES[+k.slice(5) - 1].toLowerCase()), y = MONTHS[MONTHS.length - 1].slice(0, 4);
    if (MONTHS.length === 1) return `${MESES[0]}/${y}`;
    const pos = MONTHS.map(k => (todos || MONTHS).indexOf(k)), seguidos = pos.every((p, i) => !i || p === pos[i - 1] + 1);
    return seguidos ? `${MESES[0]}–${MESES[MESES.length - 1]}/${y}` : `${MESES.join(', ')}/${y}`;
  }

  function preparar(ds, ajustes, todosMeses) {
    ajustes = ajustes || {};
    const DATA = ds.rows.map(d => ({ ...d })), MONTHS = ds.months;
    const MESES = MONTHS.map(k => NOMES_MES[+k.slice(5) - 1]);
    const PERIODO = nomePeriodo(MONTHS, todosMeses);
    DATA.forEach(d => {
      d.F = sum(d.f); d.A = sum(d.a); d.pct = d.F ? d.A / d.F : 1; d.sa = d.F - d.A;
      d.sp = d.sp || 0; d.sv = d.tv != null ? d.tv : Math.max(0, (d.s || 0) - d.sp); d.av = d.av || 0;
      d.qv = (d.nfc || 0) + (d.nfa || 0);
      d.pr = classificar(d.pct, d.sv, d.qv).pr;
      const aj = ajustes[d.m]; if (aj) { d.prCalc = d.pr; d.pr = aj.pr; d.aj = `${aj.motivo} (ajuste de ${aj.data}; calculada: ${d.prCalc})`; }
      const n = d.a.length; d.mp = d.a.filter(x => x > 0).length; d.mf = d.f.filter(x => x != null && x !== 0).length;
      d.amp = d.mp ? d.A / d.mp : 0; d.fmm = d.mf ? d.F / d.mf : 0;
      let u = -1; for (let i = n - 1; i >= 0; i--) if (d.a[i] > 0) { u = i; break; } d.ult = u; d.semPagar = u < 0 ? n : (n - 1 - u);
      d.vd = d.v ? +d.v.slice(0, 2) : null;
      d.st = statusArr(d);
      d.pend = pendencias(d);
    });
    const last = MONTHS.length - 1, nFat = DATA.filter(d => d.f[last]).length;
    const PARCIAL = DATA.length > 0 && nFat < DATA.length * 0.9;
    const lk = MONTHS[last] || '';
    const refMes = lk ? `${NOMES_MES_LONGO[+lk.slice(5) - 1]}/${lk.slice(0, 4)}` : '—';
    return { DATA, MONTHS, MESES, PERIODO, PARCIAL, refMes };
  }
  const passa = (d, SEL, skip) => (skip === 'mun' || !SEL.mun.size || SEL.mun.has(d.c)) && (skip === 'cls' || !SEL.cls.size || SEL.cls.has(clsDe(d))) && (skip === 'mat' || !SEL.mat.size || SEL.mat.has(String(d.m)));

  return { PRIOS, NOMES_MES, NOMES_MES_LONGO, sum, norm, num, serialYM, serialBR, mcNome, clsDe, lerAba, enriquecer, lerAjustes, classificar, statusArr, pendencias, recortarMeses, nomePeriodo, preparar, passa };
});
