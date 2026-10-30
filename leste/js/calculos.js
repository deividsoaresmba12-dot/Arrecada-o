/*!
 * Acompanhamento GC Leste — cálculos (funções puras, sem interface)
 * Mesma lógica da versão original. Ver docs/CALCULOS.md.
 * Funciona no navegador (window.Calculos) e no Node (module.exports), para testes.
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

  /* ---------- leitura da aba "Top GC 15K" (matriz de células) ---------- */
  const OBRIGATORIAS = ['Matricula', 'CIDADE', 'CLASSIFICACAO', 'Total Geral (faturamento)', 'Total Geral (arrecadação)', 'QTD faturas', 'Saldo de Conta'];
  const OPCIONAIS = [
    ['NOME', 'Nome'], ['CATEGORIA', 'CATEGORIA'], ['SUB_CATEGORIA', 'SUB_CATEGORIA'], ['QTD ECONOMIA', 'QTD ECONOMIA'], ['SIT_LIGACAO', 'SIT_LIGAÇÃO'],
    ['CARTEIRA', 'Carteira'], ['MACROCLUSTER.CURVA CLIENTE', 'MACROCLUSTER.CURVA CLIENTE'], ['MACROCLUSTER.MACRO CLUSTER', 'MACROCLUSTER.MACRO CLUSTER'],
    ['NOM_BAIRRO', 'NOM_BAIRRO'], ['DATA DE VENCIMENTO', 'Data de Vencimento'], ['NFC', 'NFC'], ['NFA', 'NFA'], ['PARC', 'PARC'], ['SALDO PARC', 'Saldo PARC'],
    ['DIA MEDIO DE PAGTO', 'Dia Médio de Pagto'], ['MEDIA DIAS PAGTO X VENCTO', 'Média Dias Pagto x Vencto'], ['STATUS ARRECADACAO', 'Status Arrecadação']
  ];

  /** Procura a linha de cabeçalho (MATRICULA + SALDO DE CONTA) nas 15 primeiras linhas. */
  function achaCabecalho(A) {
    for (let i = 0; i < Math.min(15, A.length); i++) { const r = (A[i] || []).map(norm); if (r.includes('MATRICULA') && r.includes('SALDO DE CONTA')) return i; }
    return -1;
  }

  /**
   * Lê a matriz de células da aba (linhas x colunas, valores crus do Excel).
   * Retorna null se a aba não tiver o cabeçalho; lança erro se faltar coluna obrigatória.
   * Retorno: {months, rows, faltamOpcionais}
   */
  function lerAba(A) {
    const h = achaCabecalho(A);
    if (h < 0) return null;
    const H = A[h].map(norm), hRaw = A[h];
    const ix = (name, from = 0) => { for (let i = from; i < H.length; i++) if (H[i] === name) return i; return -1; };
    const iM = ix('MATRICULA'), iN = ix('NOME'), iCl = ix('CLASSIFICACAO'), iEc = ix('QTD ECONOMIA'), iSit = ix('SIT_LIGACAO'), iCart = ix('CARTEIRA'),
      iB = ix('NOM_BAIRRO'), iC = ix('CIDADE'), iV = ix('DATA DE VENCIMENTO'), iCat = ix('CATEGORIA'), iSub = ix('SUB_CATEGORIA'), iCur = ix('MACROCLUSTER.CURVA CLIENTE'), iMc = ix('MACROCLUSTER.MACRO CLUSTER');
    const t1 = ix('TOTAL GERAL'), t2 = ix('TOTAL GERAL', t1 + 1), iQ = ix('QTD FATURAS'), iS = ix('SALDO DE CONTA');
    const iFm = ix('FATURAMENTO', iS + 1), iAm = ix('ARRECADACAO', iS + 1);
    const iNfc = ix('NFC'), iNfa = ix('NFA'), iPq = ix('PARC'), iSp = ix('SALDO PARC'), iDmp = ix('DIA MEDIO DE PAGTO'), iDpv = ix('MEDIA DIAS PAGTO X VENCTO'), iPt = ix('STATUS ARRECADACAO');
    const falta = [['Matricula', iM], ['CIDADE', iC], ['CLASSIFICACAO', iCl], ['Total Geral (faturamento)', t1], ['Total Geral (arrecadação)', t2], ['QTD faturas', iQ], ['Saldo de Conta', iS]].filter(x => x[1] < 0).map(x => x[0]);
    if (falta.length) throw new Error('Colunas não encontradas: ' + falta.join(', '));
    const fCols = [], aCols = {};
    for (let i = Math.max(iV, 0) + 1; i < t1; i++) { const k = serialYM(hRaw[i]); if (k) fCols.push([k, i]); }
    for (let i = t1 + 1; i < t2; i++) { const k = serialYM(hRaw[i]); if (k) aCols[k] = i; }
    if (!fCols.length) throw new Error('Não encontrei as colunas de meses (cabeçalhos com data) do faturamento.');
    const rows = [];
    for (let r = h + 1; r < A.length; r++) {
      const L = A[r] || []; const m = L[iM];
      if (m == null || !/^\d{5,}$/.test(String(m).trim())) continue;
      rows.push({
        m: +String(m).trim(), n: String(L[iN] ?? '').trim(), cat: iCat >= 0 ? L[iCat] : null, sub: iSub >= 0 ? L[iSub] : null, cur: iCur >= 0 ? L[iCur] : null, mc: iMc >= 0 ? L[iMc] : null,
        sr: iSit >= 0 && L[iSit] != null ? String(L[iSit]).trim() : null, cl: L[iCl] ?? null, ec: num(L[iEc]) || 0, sit: String(L[iSit] ?? '').toLowerCase().replace(/(^|[-\s])\S/g, c => c.toUpperCase()),
        cart: L[iCart] ?? null, b: iB >= 0 ? L[iB] : null, c: L[iC] ?? '(sem município)', v: iV >= 0 ? serialBR(L[iV]) : null,
        f: fCols.map(([, i]) => num(L[i])), a: fCols.map(([k]) => aCols[k] != null ? num(L[aCols[k]]) : null),
        q: num(L[iQ]) || 0, s: num(L[iS]) || 0, fm: iFm >= 0 ? num(L[iFm]) : null, am: iAm >= 0 ? num(L[iAm]) : null,
        nfc: iNfc >= 0 ? num(L[iNfc]) : null, nfa: iNfa >= 0 ? num(L[iNfa]) : null, pq: iPq >= 0 ? num(L[iPq]) : null, sp: iSp >= 0 ? (num(L[iSp]) || 0) : 0,
        dmp: iDmp >= 0 ? num(L[iDmp]) : null, dpv: iDpv >= 0 ? num(L[iDpv]) : null, pt: iPt >= 0 && L[iPt] != null ? String(L[iPt]).trim() : null
      });
    }
    if (!rows.length) throw new Error('A aba foi encontrada, mas não tem matrículas.');
    // corta meses finais sem nenhum lançamento
    let last = fCols.length - 1;
    while (last > 0 && rows.every(d => !d.f[last] && !d.a[last])) last--;
    rows.forEach(d => { d.f = d.f.slice(0, last + 1); d.a = d.a.slice(0, last + 1); if (iFm < 0) d.fm = d.f[last]; if (iAm < 0) d.am = d.a[last]; });
    const faltamOpcionais = OPCIONAIS.filter(([k]) => !H.includes(k)).map(x => x[1]);
    if (!Object.keys(aCols).length) faltamOpcionais.push('meses de arrecadação (entre os dois "Total Geral")');
    return { months: fCols.slice(0, last + 1).map(x => x[0]), rows, faltamOpcionais };
  }

  /* ---------- arquivo de ajustes manuais (ajustes.xlsx na pasta de dados) ---------- */
  const AJ_COLS = ['MATRICULA', 'PRIORIDADE', 'MOTIVO', 'DATA'];
  const PRIO_NORM = Object.fromEntries(PRIOS.map(p => [norm(p), p]));
  /**
   * Lê a matriz da aba de ajustes. Retorna null se não for uma aba de ajustes.
   * Lança erro com as linhas inválidas. Retorno: {ajustes:{matricula:{pr,motivo,data}}, n}
   */
  function lerAjustes(A) {
    let h = -1;
    for (let i = 0; i < Math.min(10, A.length); i++) { const r = (A[i] || []).map(norm); if (r.includes('MATRICULA') && r.includes('PRIORIDADE')) { h = i; break; } }
    if (h < 0) return null;
    const H = A[h].map(norm), ix = k => H.indexOf(k);
    const falta = AJ_COLS.filter(k => ix(k) < 0);
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
  /** Prioridade pela regra (sem ajuste manual). */
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

  /**
   * Prepara a base: campos derivados, prioridade, status, pendências, período e mês parcial.
   * Não altera as linhas recebidas.
   */
  function preparar(ds, ajustes) {
    ajustes = ajustes || {};
    const DATA = ds.rows.map(d => ({ ...d })), MONTHS = ds.months;
    const MESES = MONTHS.map(k => NOMES_MES[+k.slice(5) - 1]);
    const y = MONTHS.length ? MONTHS[MONTHS.length - 1].slice(0, 4) : '';
    const PERIODO = MONTHS.length ? `${MESES[0].toLowerCase()}–${MESES[MESES.length - 1].toLowerCase()}/${y}` : '';
    DATA.forEach(d => {
      d.F = sum(d.f); d.A = sum(d.a); d.pct = d.F ? d.A / d.F : 1; d.sa = d.F - d.A;
      d.sp = d.sp || 0; d.sv = Math.max(0, (d.s || 0) - d.sp);
      d.qv = (d.nfc != null || d.nfa != null) ? (d.nfc || 0) + (d.nfa || 0) : (d.q || 0);
      d.pr = classificar(d.pct, d.sv, d.qv).pr;
      const aj = ajustes[d.m]; if (aj) { d.prCalc = d.pr; d.pr = aj.pr; d.aj = `${aj.motivo} (ajuste de ${aj.data}; calculada: ${d.prCalc})`; }
      const n = d.a.length; d.mp = d.a.filter(x => x > 0).length; d.mf = d.f.filter(x => x != null && x !== 0).length;
      d.amp = d.mp ? d.A / d.mp : 0; d.fmm = d.mf ? d.F / d.mf : 0;
      let u = -1; for (let i = n - 1; i >= 0; i--) if (d.a[i] > 0) { u = i; break; } d.ult = u; d.semPagar = u < 0 ? n : (n - 1 - u);
      d.vd = d.v ? +d.v.slice(0, 2) : null;
      d.st = statusArr(d);
      d.pend = pendencias(d);
    });
    const last = MONTHS.length - 1, nFat = DATA.filter(d => d.f[last] != null).length;
    const PARCIAL = DATA.length > 0 && nFat < DATA.length * 0.9;
    const lk = MONTHS[last] || '';
    const refMes = lk ? `${NOMES_MES_LONGO[+lk.slice(5) - 1]}/${lk.slice(0, 4)}` : '—';
    return { DATA, MONTHS, MESES, PERIODO, PARCIAL, refMes };
  }

  /* ---------- filtros ---------- */
  /** SEL = {mun:Set, cls:Set, mat:Set}; skip = filtro a ignorar. */
  const passa = (d, SEL, skip) => (skip === 'mun' || !SEL.mun.size || SEL.mun.has(d.c)) && (skip === 'cls' || !SEL.cls.size || SEL.cls.has(clsDe(d))) && (skip === 'mat' || !SEL.mat.size || SEL.mat.has(String(d.m)));
  const filtrar = (DATA, SEL) => DATA.filter(d => passa(d, SEL));

  /* ---------- agregações ---------- */
  /** Cartões do topo. */
  function totais(rows, nMeses) {
    const last = nMeses - 1;
    const F = sum(rows.map(d => d.F)), A = sum(rows.map(d => d.A)), S = sum(rows.map(d => d.s)), fm = sum(rows.map(d => d.fm)), am = sum(rows.map(d => d.am));
    const SV = sum(rows.map(d => d.sv || 0)), SP = sum(rows.map(d => d.sp));
    return {
      F, A, S, fm, am, SV, SP, p: F ? A / F : 0, pm: fm ? am / fm : 0, falta: Math.max(0, F - A),
      pctSV: S ? SV / S : 0, nSV: rows.filter(d => d.sv > 0).length,
      qv: sum(rows.map(d => d.qv)), pq: sum(rows.map(d => d.pq || 0)),
      nFat: rows.filter(d => d.f[last] != null).length, nCad: rows.filter(d => d.pend.length).length, n: rows.length
    };
  }
  /** Série mensal somada. */
  function serieMensal(rows, nMeses) {
    const f = [...Array(nMeses)].map((_, i) => sum(rows.map(d => d.f[i]))), a = [...Array(nMeses)].map((_, i) => sum(rows.map(d => d.a[i])));
    return { f, a };
  }
  /** Médias mensais (meses com faturado ≠ 0). */
  function mediasMensais(f, a) {
    const nm = f.filter(v => v).length || 1, mF = sum(f) / nm, mA = sum(a) / nm;
    return { nm, mF, mA, pct: mF ? mA / mF : 0 };
  }
  /** Δ mês a mês (null no 1º mês ou sem valor). */
  const deltas = v => v.map((x, i) => (!i || x == null || v[i - 1] == null) ? null : x - v[i - 1]);
  /** Pareto 80/20 por macro cluster. met: 's' | 'sv' | 'n'. */
  function pareto(rows, met) {
    const val = d => met === 'n' ? 1 : met === 'sv' ? (d.sv || 0) : (d.s || 0);
    const g = {}; rows.forEach(d => { const k = mcNome(d.mc); g[k] = (g[k] || 0) + val(d); });
    const ent = Object.entries(g).filter(e => e[1] > 0).sort((x, y) => y[1] - x[1]);
    const tot = sum(ent.map(e => e[1])); let ac = 0; const cum = ent.map(e => { ac += e[1]; return tot ? ac / tot * 100 : 0; });
    const vital = ent.map((e, i) => i === 0 || cum[i - 1] < 80);
    const nv = vital.filter(Boolean).length;
    return { labels: ent.map(e => e[0]), valores: ent.map(e => e[1]), cum, vital, tot, nv, n: ent.length, pctGrupos: ent.length ? nv / ent.length : 0, pctConc: nv ? cum[nv - 1] / 100 : 0 };
  }
  /** Resumo por grupo. dim: 'mc' | 'cl'. */
  function grupos(rows, dim) {
    const g = {};
    rows.forEach(d => { const k = dim === 'mc' ? mcNome(d.mc) : (d.cl || '(sem classificação)'); (g[k] ??= { n: 0, ec: 0, q: 0, s: 0, F: 0, A: 0 }); const o = g[k]; o.n++; o.ec += d.ec || 0; o.q += d.qv || 0; o.s += d.s || 0; o.F += d.F; o.A += d.A; });
    const lista = Object.entries(g).sort((a, b) => b[1].s - a[1].s);
    const T = lista.reduce((t, [, o]) => ({ n: t.n + o.n, ec: t.ec + o.ec, q: t.q + o.q, s: t.s + o.s, F: t.F + o.F, A: t.A + o.A }), { n: 0, ec: 0, q: 0, s: 0, F: 0, A: 0 });
    return { lista, T };
  }
  /** Top N por faturado, opcionalmente de uma prioridade. */
  const topFaturado = (rows, pr, n) => rows.filter(d => !pr || d.pr === pr).sort((a, b) => b.F - a.F).slice(0, n);
  /** Cartão de um nível de prioridade. */
  function cartaoPrio(rows, p) {
    const r = rows.filter(d => d.pr === p), s = sum(r.map(d => d.s)), tot = sum(rows.map(d => d.s));
    return { n: r.length, pctN: rows.length ? r.length / rows.length : 0, s, pctS: tot ? s / tot : 0, sp: sum(r.map(d => d.sp)), sv: sum(r.map(d => d.sv)) };
  }
  /** Contagem por pendência. */
  function resumoCadastro(rows) {
    const tot = rows.filter(d => d.pend.length);
    return { n: tot.length, s: sum(tot.map(d => d.s)), por: ['cart', 'cort', 'pj'].map(k => [k, rows.filter(d => d.pend.includes(k)).length]).filter(x => x[1]) };
  }
  /** Números do resumo executivo da tela. */
  function resumoExecutivo(rows) {
    const cr = rows.filter(d => d.pr === 'CRÍTICA'), sc = sum(cr.map(d => d.s));
    const zero = rows.filter(d => d.A === 0 && d.F > 0);
    const g = {}; rows.forEach(d => { g[d.cl] = (g[d.cl] || 0) + (d.s || 0); }); const topCl = Object.entries(g).sort((a, b) => b[1] - a[1])[0];
    const semCart = rows.filter(d => d.cart === 'Sem Carteira'), big = [...rows].sort((a, b) => b.s - a.s)[0];
    return { nCr: cr.length, sCr: sc, nZero: zero.length, sZero: sum(zero.map(d => d.s)), topCl, big, nSemCart: semCart.length, sSemCart: sum(semCart.map(d => d.s)), SP: sum(rows.map(d => d.sp)) };
  }
  /** Estatísticas da janela de detalhe. */
  function statsDetalhe(rows) {
    const F = sum(rows.map(d => d.F)), A = sum(rows.map(d => d.A)), S = sum(rows.map(d => d.s));
    const dps = rows.filter(d => typeof d.dmp === 'number'), dvs = rows.filter(d => typeof d.dpv === 'number');
    return { F, A, S, pct: F ? A / F : NaN, sp: sum(rows.map(d => d.sp)), sv: sum(rows.map(d => d.sv)), qv: sum(rows.map(d => d.qv)),
      dmp: dps.length ? sum(dps.map(d => d.dmp)) / dps.length : null, dpv: dvs.length ? sum(dvs.map(d => d.dpv)) / dvs.length : null };
  }
  /** Contagens do quadro "Critérios e dados faltantes" (base inteira). */
  function lacunas(DATA, nMeses) {
    const last = nMeses - 1;
    return { semVenc: DATA.filter(d => !d.v).length, semCart: DATA.filter(d => d.cart === 'Sem Carteira').length, nFat: DATA.filter(d => d.f[last] != null).length, ajustes: DATA.filter(d => d.aj), n: DATA.length };
  }

  return {
    PRIOS, NOMES_MES, NOMES_MES_LONGO, OBRIGATORIAS,
    sum, norm, num, serialYM, serialBR, mcNome, clsDe,
    achaCabecalho, lerAba, lerAjustes, classificar, statusArr, pendencias, preparar,
    passa, filtrar, totais, serieMensal, mediasMensais, deltas, pareto, grupos, topFaturado, cartaoPrio, resumoCadastro, resumoExecutivo, statsDetalhe, lacunas
  };
});
