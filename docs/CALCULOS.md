# Cálculos do painel — Acompanhamento GC Leste (Top GC 15K)

Regras de negócio da versão **original**, exatamente como estão no código. `L123` = linha do `template.html` original.
Itens marcados **PERGUNTA** são ambiguidades ou inconsistências encontradas no código.

> **Decisão (30/10/2026):** manter todas as regras como estão (PERGUNTAS 1 a 7). A versão 1.0.0 reproduz o original com diferença zero.

**Onde está cada cálculo na versão 1.0.0** (`js/calculos.js`): leitura `lerAba`/`num`/`serialYM`/`serialBR`; ajustes `lerAjustes`; prioridade `classificar`; status `statusArr`; pendências `pendencias`; campos derivados `preparar`; filtros `passa`/`filtrar`; cartões `totais`; gráfico `serieMensal`/`mediasMensais`/`deltas`; Pareto `pareto`; tabela por grupo `grupos`; Top 20 `topFaturado`; cartões de prioridade `cartaoPrio`; cadastro `resumoCadastro`; resumo `resumoExecutivo`; janela `statsDetalhe`; lacunas `lacunas`.

> Este documento não contém dados reais.

---

## 1. Leitura e limpeza (`parseSheet`, L1045–1080)

| Regra | Como funciona | Linha |
|---|---|---|
| Linha válida | Só entra a linha cuja Matrícula tem **5 ou mais dígitos** (descarta totais, linhas em branco e textos) | L1066 |
| Números | Célula numérica → arredondada para **2 casas**. Texto → tira `R$`, espaços e **todos os pontos**, troca vírgula por ponto. Vazio/inválido → `null` | L1044 |
| Vazios com padrão | `ec`, `q`, `s` vazios → 0; `sp` vazio → 0; `c` vazio → "(sem município)" | L1067–1071 |
| Meses de faturamento | Colunas com data entre "Data de Vencimento" e o 1º "Total Geral" | L1060 |
| Meses de arrecadação | Colunas com data entre os dois "Total Geral", casadas com o faturamento **pela chave `aaaa-mm`**; um mês de arrecadação sem par no faturamento é ignorado | L1061, L1069 |
| Corte de meses no fim | Remove do fim os meses em que **todas** as matrículas têm faturado **e** arrecadado vazio ou 0 (mantém ao menos 1 mês) | L1076–1077 |
| Faturado/Arrecadado do mês | Usa as colunas "Faturamento"/"Arrecadação" que vêm **depois** de "Saldo de Conta". Se não existirem → valor do último mês | L1055, L1078 |
| Duplicidades | **Não há tratamento**: matrícula repetida conta duas vezes | — |

- **PERGUNTA 1** — Texto com ponto decimal (ex.: `"1234.56"`) vira `123456`. Hoje os valores chegam como número no xlsx, então isso não acontece. Manter?
- **PERGUNTA 2** — Matrícula duplicada na planilha é somada duas vezes. Manter, avisar ou recusar a base?

---

## 2. Campos derivados por matrícula (`prep`, L445–474)

| Campo | Fórmula | Vazios | Linha |
|---|---|---|---|
| `F` Faturado do período | soma de `f[]` | `null` conta 0 | L451 |
| `A` Arrecadado do período | soma de `a[]` | `null` conta 0 | L451 |
| `pct` % arrecadado | `A / F`; **se F = 0 → 1 (100%)** | — | L451 |
| `sa` Saldo (fat – arr) | `F − A` | — | L451 |
| `sv` Saldo vencido | `max(0, s − sp)` | `sp` vazio = 0 | L452 |
| `qv` Faturas em aberto | `nfc + nfa` se NFC **ou** NFA existir; senão `q` (QTD faturas) | o que faltar conta 0 | L453 |
| `mp` Meses pagantes | nº de meses com `a > 0` | — | L458 |
| `mf` Meses faturados | nº de meses com `f ≠ null` e `f ≠ 0` | — | L458 |
| `amp` Arrec. média/mês pagante | `A / mp` (0 se mp = 0) | — | L459 |
| `fmm` Fat. médio/mês | `F / mf` (0 se mf = 0) | — | L459 |
| `ult` Último pagamento | índice do último mês com `a > 0` (−1 se nenhum) | — | L460 |
| `semPagar` | `n − 1 − ult`; se nunca pagou = nº de meses | — | L460 |
| `vd` Dia de vencimento | 2 primeiros caracteres da data `dd/mm/aaaa` | sem data → `null` | L461 |

- **PERGUNTA 3** — Matrícula com faturado 0 no período fica com 100% arrecadado (e não entra em CRÍTICA/ALTA por %). Manter?

---

## 3. Prioridade de cobrança (L454–457)

Com `p = pct` e `s = sv` (saldo vencido):

| Ordem | Nível | Condição |
|---|---|---|
| 1 | CRÍTICA | `p < 0,50` **ou** `sv ≥ 1.000.000` |
| 2 | ALTA | `p < 0,75` **ou** `sv ≥ 300.000` |
| 3 | MÉDIA | `p < 0,95` **ou** `sv ≥ 100.000` |
| 4 | BAIXA | `sv > 0` **e** `qv > 1` |
| 5 | REGULAR | demais casos |

- **Teto**: se `p ≥ 0,95` e o nível deu CRÍTICA ou ALTA → vira **MÉDIA** (L456).
- **Ajuste manual** (no original, `AJUSTES` fixo em L411–418, aplicado em L457; na versão 1.0.0, lido do arquivo `ajustes.xlsx` da pasta): para as matrículas listadas, a prioridade final é a informada; guarda `prCalc` (calculada) e o texto `aj` com motivo e data. O ajuste é aplicado **depois** do teto.
- Comparações usam os valores sem arredondar (só o arredondamento de 2 casas da leitura).
- O balão "Por quê" (`motivoPr`, L994–1007) refaz a mesma conta para explicar.

- **PERGUNTA 4** — Uma matrícula com `sv = 0` e mais de 1 fatura em aberto cai em **REGULAR** (a regra BAIXA exige `sv > 0`). Os textos de critério (L422–423, L649) e o balão dizem só "mais de 1 fatura" / "até 1 fatura", sem citar o `sv > 0`. O balão pode mostrar "REGULAR … N faturas em aberto (até 1)" com N > 1. Manter a regra e só corrigir o texto, ou outra decisão?

---

## 4. Status de arrecadação (`statusArr`, L706–713)

Avaliado nesta ordem:

| Status | Condição |
|---|---|
| Sem pagamento no período | `A = 0` |
| Parou de pagar há N meses | `semPagar ≥ 3` |
| Pagando acima do faturado | `pct ≥ 1,02` |
| Em dia | `pct ≥ 0,95` |
| Pagamento parcial | `pct ≥ 0,50` |
| Pagamento irregular | demais |

**Pontualidade** é a coluna "Status Arrecadação" como veio da planilha, só com cor (`PTC`, L704).

---

## 5. Pendências cadastrais (`pendencias`, L722–733; exibidas em `cad`, L734–739)

Só três tipos aparecem (os demais calculados são descartados — ver CONSTRUCAO.md §5):

| Tipo | Regra |
|---|---|
| Sem carteira executiva | Carteira vazia ou, sem acento/maiúsculas, igual a "SEM CARTEIRA" |
| Cortada/inativa faturando | Situação da ligação (normalizada) não começa com "A" **e** faturado do último mês > 0 |
| PJ em categoria residencial | Categoria = RESIDENCIAL **e** o nome contém LTDA, S/A, S.A, EIRELI, ME ou EPP (palavra inteira, sem diferenciar maiúsculas) **e** não contém "CONDOMINIO" |

- **PERGUNTA 5** — "Sem carteira" usa duas regras diferentes: a pendência aceita vazio e qualquer grafia; o **Resumo executivo** (L677) e "Critérios e dados faltantes" (L688) contam só o texto exato `Sem Carteira`. Os números podem divergir. Unificar (qual regra?) ou manter?
- **PERGUNTA 6** — A exclusão "CONDOMINIO" não reconhece "CONDOMÍNIO" com acento. Manter?

---

## 6. Período, mês de referência e mês parcial (L447–472)

- `MESES`: nome curto de cada mês; `PERIODO` = "primeiro–último/ano do último" (ex.: `jan–out/aaaa`).
- **Mês de referência** = último mês após o corte (§1).
- **PARCIAL** = menos de **90%** das matrículas **da base inteira** com faturado do último mês ≠ vazio (L467–468). Marca o mês com `*` no gráfico e muda as notas.
- O rodapé dos cartões conta `f[último] ≠ vazio` nas matrículas **do filtro** (L600, L602).

---

## 7. Filtros (L477–524)

- Município = `c`; Classificação = `cl` ou "(sem classificação)"; Matrícula = `m`.
- Multisseleção; conjunto vazio = todos. Os três se combinam com **E**.
- As opções de Classificação contam só o filtro de Município; as de Matrícula respeitam Município e Classificação, ordenadas por `F` decrescente; ao mudar Município/Classificação, matrículas fora do novo recorte saem da seleção (L508).

---

## 8. Indicadores (cartões, `kpis`, L598–624)

Sobre as matrículas filtradas:

| Indicador | Fórmula |
|---|---|
| Arrec x Fat. acumulado | `ΣA / ΣF` (**se ΣF = 0 → 0%**); barra limitada a 100%; balão "faltam `max(0, ΣF − ΣA)`" |
| Faturado do mês | `Σfm` |
| Arrecadado do mês | `Σam`; nota `Σam / Σfm`; se > 100% acrescenta "inclui faturas anteriores e parcelamentos" |
| Saldo em aberto · saldo de conta | `Σs`; notas: parcelado `Σsp`, faturas em aberto `Σqv`, parcelas futuras `Σpq` |
| Saldo vencido | `Σsv`; notas: `Σsv / Σs`, nº de matrículas com `sv > 0` |
| Matrículas | contagem |
| Atualização cadastral | nº de matrículas com ao menos 1 pendência |

Formas curtas: "R$ x,x mi" (≥ 1 mi), "R$ x,x mil" (≥ 1 mil), 1 casa decimal.

---

## 9. Cartões de prioridade (`prio`, L660–665)

Para cada nível: nº de matrículas e `% = n_nível / n_filtro`; `Σs` e `% = Σs_nível / Σs_filtro`; `Σsp` parcelado; `Σsv` vencido; critério e ação sugerida (textos fixos `CRIT`/`ACAO`).

---

## 10. Gráfico Faturamento x Arrecadação (`charts`, L530–564)

- Por mês: `fat[i] = Σ f[i]`, `arr[i] = Σ a[i]` (vazios = 0).
- **Δ Fat / Δ Arr** (linhas acima das barras): `valor[i] − valor[i−1]`, em **R$ milhões**, 2 casas (1 casa em telas estreitas); verde se ≥ 0, vermelho se < 0; o 1º mês mostra "–".
- Balão: valor do mês e Δ vs mês anterior em R$ e em % (`Δ / anterior`, omitido se anterior = 0).
- **Nota de médias** (L536–537): `nm` = nº de meses com faturado total ≠ 0; média faturado = `Σfat / nm`; média arrecadado = `Σarr / nm`; % = média arr / média fat.

## 11. Pareto por macro cluster (L565–594)

- Nome do grupo (`mcNome`, L528): tira o prefixo "N. "; vazio ou "-" → "(não informado)".
- Medida: Saldo de conta (`s`, padrão), Saldo vencido (`sv`) ou Matrículas (1 por matrícula).
- Grupos com total > 0, em ordem decrescente; `% acumulado = acumulado / total × 100`.
- **Grupo "vital"** (barra escura): o 1º grupo e todo grupo cujo acumulado **anterior** é < 80%.
- Nota: "X de Y macro clusters (X/Y) concentram Z%".

---

## 12. Tabelas

**Resumo por macro cluster / classificação** (`tabCls`, L628–639), ordem por saldo de conta decrescente:

| Coluna | Fórmula |
|---|---|
| Qtd matrículas | `n` |
| Economia média | `Σec / n` |
| Fat. médio/mês por matrícula | `ΣF / n / nº de meses do período` |
| Faturas em aberto | `Σqv` |
| Saldo de conta | `Σs` |
| % do saldo | `Σs_grupo / Σs_total` |
| % arrecadado | `ΣA / ΣF` (ΣF = 0 → "—" e cor de "ok") |

> Observação: aqui o "médio/mês" divide pelo nº de meses do período; na janela de detalhe (`fmm`) divide pelos meses com faturamento ≠ 0. São médias diferentes por definição — mantido.

**Top 20** (`tabTop`, L654–659): filtro opcional por prioridade; ordem por `F` decrescente; 20 primeiras. Cor do %: < 50% vermelho, < 95% laranja, demais azul (`pctClass`, L475).

**Legenda de critérios** (L647–653): contagem e % por nível no filtro.

---

## 13. Janela de detalhe (L740–811)

- Prioridade/grupo/macro cluster: ordem por `s` decrescente. Saldo vencido: só `sv > 0`, ordem por `sv` decrescente. Cadastro: por nº de pendências, depois `s`.
- Estatísticas: `ΣF`, `ΣA`, `ΣA/ΣF`, `Σs`, `Σsp`, `Σsv`; **dia médio de pagamento** = média de `dmp` entre quem tem número; **dias pagto x venc.** = média de `dpv` idem.
- Cadastro: com pendência / total; total de pendências; `Σs` e `% de Σs`; sem contar só "sem carteira"; com 2+ pendências; CRÍTICAS com pendência; `Σfm`.
- Rodapé: totais de `s`, `sp`, `sv`, `F`, `A`, `qv` e % arrecadado.

---

## 14. Resumo executivo na tela (`resumo`, L671–686)

Frases sobre o filtro: faturado, arrecadado, % e saldo do período; saldo de conta, parcelado, nº e % de CRÍTICAS no saldo; nº de matrículas com `A = 0` e `F > 0` e seu saldo; classificação de maior saldo e maior devedor (`s` máximo); matrículas "Sem Carteira" (texto exato — ver PERGUNTA 5).

## 15. Critérios e dados faltantes (`gaps`, L687–703)

Calculado sobre a **base inteira**: mês parcial; nº sem data de vencimento; nº e lista de ajustes manuais; nº "Sem Carteira" (texto exato); total de matrículas. As 3 observações fixas da base publicada saem na versão nova (decisão do usuário).

---

## 16. Exportações

**Excel** (`exportPrio`, L852–887) — filtro atual; nível: ordem por `s` decrescente; base inteira: ordem por `F` decrescente. Valores em R$ arredondados para 2 casas. "% arrecadado" fica **vazio se F = 0** (na tela, 100%). Aba "Critério" com resumo e filtros. Nome: `TopGC_Leste_<Base|Prioridade_X>_<aaaa-mm>[_municipio].xlsx`.

**PDF** (`gerarResumoPDF`, L895–988) — mesmos totais dos cartões; 3 cartões de prioridade; imagem dos dois gráficos; médias mensais; resumo; **Top 5 críticas por saldo de conta** e **Top 5 regulares por faturamento**. Nome: `TopGC_Leste_Resumo_Executivo_<aaaa-mm>.pdf`.

- **PERGUNTA 7** — Matrícula com F = 0 aparece com 100% na tela e % vazio no Excel. Manter?

---

## 17. Arredondamentos

- Leitura: 2 casas (§1). Cálculos: sem arredondar. Exibição: R$ 2 casas, % 1 casa, médias 1 casa, Δ em R$ mi com 1–2 casas.
- Excel: R$ com 2 casas; % no formato `0.0%`.
