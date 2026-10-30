# Construção do painel — Acompanhamento GC Leste (Top GC 15K)

Documento de mapeamento da versão **original** (seções 1 a 5) e da versão publicada no GitHub (seção 6) (página única publicada como artefato do Claude, com dados embutidos).
As referências `L123` apontam para as linhas do arquivo original `template.html` (1.197 linhas), que não vai para o repositório.

> Este documento não contém dados reais: nenhuma matrícula, nome, endereço ou valor.

---

## 1. Estrutura

### 1.1 Arquivos da versão original

| Arquivo | Papel |
|---|---|
| `template.html` | Fonte única: HTML + CSS + JavaScript num só arquivo. Tem os marcadores `__DATA__` e `__MONTHS__`. |
| `data.json` / `months.json` | Base extraída da planilha (gerada fora do painel por script Python). |
| Script de montagem (Python) | Troca `__DATA__`/`__MONTHS__` pelo conteúdo dos JSON e gera o HTML publicado. |
| HTML publicado | Resultado da montagem; é o que roda no Claude. |

### 1.2 Bibliotecas externas

| Biblioteca | Versão | Origem | Carregamento | Uso |
|---|---|---|---|---|
| Chart.js | 4.4.1 | cdnjs (`chart.umd.min.js`) | `<script>` no início (L400) | Gráfico Fat x Arr e Pareto |
| SheetJS (xlsx) | 0.18.5 | cdnjs (`xlsx.full.min.js`) | `<script>` no início (L401) | Leitura da planilha e exportação Excel |
| jsPDF | 2.5.1 | jsdelivr (`jspdf.umd.min.js`) | Sob demanda, ao clicar em "Resumo executivo" (L890–891) | PDF de 1 página A4 |
| IBM Plex Sans / Mono | — | Google Fonts (L4–5) | `<link>` | Tipografia |

Nenhuma das três tem verificação de integridade (SRI) hoje.

### 1.3 Seções da página (ordem na tela)

| # | Seção | Elemento | Linhas |
|---|---|---|---|
| 1 | Cabeçalho: logo, "ACOMPANHAMENTO GC", subtítulo, "LESTE" grande, mês de referência | `header.band`, `#refMes`, `#refNote` | L311–321 |
| 2 | Barra de fonte: status, botões de pasta/arquivo/resumo/base, mensagens | `.bar-top .src`, `#srcStatus`, `#btnPasta`, `#btnArquivo`, `#btnResumo`, `#btnBaseXls`, `#btnBase`, `#inDir`, `#inFile`, `#srcMsg` | L323–334 |
| 3 | Filtros multisseleção: Município, Classificação, Matrícula; "Limpar filtros"; texto do filtro ativo | `#msMun`, `#msCls`, `#msMat`, `#btnReset`, `#activeFilter` | L335–341 |
| 4 | Indicadores: barra "Arrec x Fat. acumulado" + 4 cartões (Faturado do mês, Arrecadado do mês, Saldo em aberto, Saldo vencido) + rodapé (Matrículas, Atualização cadastral) | `#kpis` | L344 (montado em L598–624) |
| 5 | Prioridade de cobrança: cartões CRÍTICA, ALTA, MÉDIA | `#prioTop` | L346–349 |
| 6 | Gráficos: Faturamento x Arrecadação (colunas + Δ mensal + médias) e Macro cluster (Pareto 80/20, alternância Saldo de conta / Saldo vencido / Matrículas) | `#cCol`, `#colNota`, `#cLin`, `#segPareto`, `#paretoNota` | L351–354 |
| 7 | Resumo por macro cluster / classificação (alternância) | `#tCls`, `#segCls` | L356–359 |
| 8 | Top 20 matrículas, com filtro por prioridade, e legenda de critérios | `#tTop`, `#segTop`, `#critLeg` | L361–365 |
| 9 | Prioridade baixa e regular: cartões BAIXA, REGULAR | `#prio` | L367–370 |
| 10 | Atualização cadastral: um cartão clicável | `#cad` | L372–375 |
| 11 | Resumo executivo (painel escuro, frases automáticas) | `#resumo` | L378–381 |
| 12 | Critérios e dados faltantes | `#gaps` | L383–386 |
| — | Aviso flutuante (toast) | `#toast` | L388 |
| — | Janela de detalhe (lista de matrículas) | `dialog#dlg`: `#dTit`, `#dSub`, `#dStats`, `#dBusca`, `#dChips`, `#dTab`, `#dNote` | L390–398 |
| — | Balão do motivo da prioridade | `#tipPr` (criado via JS) | L1010–1027 |

### 1.4 Componentes interativos

- **Cartões de prioridade** (`.pc`): clique abre a lista de matrículas do nível; o ícone ⤓ baixa o nível em Excel (L831–834).
- **Cartão Saldo vencido**: abre a lista de quem tem saldo vencido > 0 (L819–821).
- **Rodapé "Atualização cadastral"** e cartão `#cad`: abrem a lista de pendências (L816–818, L822).
- **Linhas da tabela por macro cluster/classificação**: abrem as matrículas do grupo (L824–826).
- **Barras do Pareto**: abrem as matrículas do macro cluster (L580).
- **Etiquetas de prioridade** (`.pill.tp`): mostram o balão "Por quê" (L994–1027).
- **Janela de detalhe**: busca por matrícula/cliente, chips por status de arrecadação (ou por tipo de pendência), cabeçalho fixo (L740–811).
- **Botões de exportação**: "Resumo executivo" (PDF, L895–988), "Baixar base (Excel)" e ⤓ por nível (L852–887).

### 1.5 Estilo

**Variáveis CSS (`:root`, L8–15)**

| Variável | Valor | Uso |
|---|---|---|
| `--preto` | `#05050D` | Texto |
| `--marinho` | `#123A7A` | Fundo da página, títulos, barras Faturado, REGULAR |
| `--azul` | `#2A60B8` | Borda da folha |
| `--azul-claro` | `#4A86D2` | Barras Arrecadado, BAIXA, destaques |
| `--cinza` | `#F2F2F2` | Fundo da folha |
| `--laranja` / `--laranja-texto` | `#E8710A` / `#C2560C` | Linha do Pareto, ALTA |
| `--card` | `#ffffff` | Cartões |
| `--muted` | `#5b6578` | Texto secundário |
| `--line` | `#d9dee6` | Bordas |
| `--soft` / `--trilho` | `#EEF4F8` / `#DCE6EE` | Fundos suaves / trilho da barra |
| `--on-dark` / `--on-dark-muted` | `#ffffff` / `#b9c6d8` | Texto sobre fundo escuro |
| `--crit` `--alta` `--media` `--baixa` `--reg` | `#B42318` `#E8710A` `#F2B53A` `#4A86D2` `#123A7A` | Cores das prioridades |
| `--sans` / `--mono` | IBM Plex Sans / IBM Plex Mono | Fontes |

- Cabeçalho: degradê `linear-gradient(135deg,#0e3373 0%,#184a96 60%,#2560b4 100%)`.
- Positivo/negativo nos Δ: `#1f8a70` / `#B42318`.
- Pareto: barras do grupo até 80% em `#123A7A`; demais em `#A9C2E6`.
- Layout: largura máxima de 1360px; folha com `display:grid` e espaçamento de 18px; `grid2` para os dois gráficos; tabelas com rolagem horizontal (`.tw`); ajustes para celular em media queries; `color-scheme: light` (só tema claro).
- Logo: PNG branco em base64, embutido no `<img>` do cabeçalho (L313), também usado no PDF (L911).

---

## 2. Fontes de dados

### 2.1 Arquivo e aba

- Tipos aceitos hoje: `.xlsx`, `.xls`, `.csv` (L332, L1109). Arquivos `~$…` e ocultos são ignorados.
- **Na prática, CSV não funciona**: os meses são reconhecidos por cabeçalho com **número de série de data do Excel** (L1042), o que só existe em xlsx/xls.
- O painel percorre **todas as abas** e usa a **primeira** cuja linha de cabeçalho (entre as 15 primeiras linhas) contenha `MATRICULA` **e** `SALDO DE CONTA` (L1046–1049, L1085–1087). Na base atual é a aba **"Top GC 15K"** (cabeçalho na linha 2).
- As abas `Query1`, `Arrecadação`, `Saldo Data` e `Data Sources` **não são lidas**.
- Escolha do arquivo na pasta (L1117–1133): pontuação pelo nome (`15k` = 4, `gc`/`top` = 2, `lest` = 1), depois o mais recente; tenta até 25 arquivos; ignora arquivos acima de 60 MB.

### 2.2 Colunas (nomes comparados sem acento, sem espaços extras, em maiúsculas — função `norm`, L1041)

| Nome na planilha | Nome normalizado | Campo | Obrigatória | Tipo / leitura |
|---|---|---|---|---|
| Matricula | MATRICULA | `m` | **Sim** | Só linhas com 5+ dígitos; vira número |
| Nome | NOME | `n` | Não | Texto (trim) |
| CATEGORIA | CATEGORIA | `cat` | Não | Texto como veio |
| SUB_CATEGORIA | SUB_CATEGORIA | `sub` | Não | Texto como veio |
| QTD ECONOMIA | QTD ECONOMIA | `ec` | Não | Número (`num`), vazio → 0 |
| CLASSIFICACAO | CLASSIFICACAO | `cl` | **Sim** | Texto |
| SIT_LIGAÇÃO | SIT_LIGACAO | `sr` (bruto) e `sit` (capitalizado) | Não | Texto |
| Carteira | CARTEIRA | `cart` | Não | Texto |
| MACROCLUSTER.CURVA CLIENTE | MACROCLUSTER.CURVA CLIENTE | `cur` | Não | Texto |
| MACROCLUSTER.MACRO CLUSTER | MACROCLUSTER.MACRO CLUSTER | `mc` | Não | Texto (ex.: "N. Nome") |
| NOM_BAIRRO | NOM_BAIRRO | `b` | Não | Texto |
| CIDADE | CIDADE | `c` | **Sim** | Texto; vazio → "(sem município)" |
| Data de Vencimento | DATA DE VENCIMENTO | `v` | Não | Série Excel → `dd/mm/aaaa` |
| *(datas entre "Data de Vencimento" e o 1º "Total Geral")* | série Excel | `f[]` | **Sim** (ao menos 1) | Faturamento por mês, chave `aaaa-mm` |
| Total Geral (1º) | TOTAL GERAL | — | **Sim** | Só delimita o bloco de faturamento |
| *(datas entre os dois "Total Geral")* | série Excel | `a[]` | Não* | Arrecadação por mês, casada pela mesma chave `aaaa-mm` |
| Total Geral (2º) | TOTAL GERAL | — | **Sim** | Delimita o bloco de arrecadação |
| NFC | NFC | `nfc` | Não | Número |
| NFA | NFA | `nfa` | Não | Número |
| PARC | PARC | `pq` | Não | Número (parcelas futuras) |
| Saldo PARC | SALDO PARC | `sp` | Não | Número, vazio → 0 |
| QTD faturas | QTD FATURAS | `q` | **Sim** | Número, vazio → 0 |
| Saldo de Conta | SALDO DE CONTA | `s` | **Sim** | Número, vazio → 0 |
| Faturamento (após Saldo de Conta) | FATURAMENTO | `fm` | Não | Número; se a coluna não existir → faturado do último mês |
| Arrecadação (após Saldo de Conta) | ARRECADACAO | `am` | Não | Número; se não existir → arrecadado do último mês |
| Dia Médio de Pagto | DIA MEDIO DE PAGTO | `dmp` | Não | Número |
| Média Dias Pagto x Vencto | MEDIA DIAS PAGTO X VENCTO | `dpv` | Não | Número |
| Status Arrecadação | STATUS ARRECADACAO | `pt` | Não | Texto (Adiantado, Em dia, Atraso leve, Atrasado, Atraso grave, Sem pagamento) |

\* Se não houver meses de arrecadação, `a[]` fica com `null` em todos os meses.

Colunas presentes na planilha e **não usadas**: TIPO DOCUMENTO, LIGAÇÃO DE ÁGUA, LIGAÇÃO DE ESGOTO, COD_GRUPO, AREA_DE_RISCO.FLAG_AREA_RISCO, Ação, Observação, "A partir de (dias)", Perfil.

Mensagens de erro atuais: "Colunas não encontradas: …" (L1057–1058); "Não encontrei as colunas de meses…" (L1062); "A aba foi encontrada, mas não tem matrículas." (L1074).

### 2.3 Formatos

- **Números** (`num`, L1044): se a célula já é número → arredonda para 2 casas. Se é texto → remove `R$`, espaços e **todos os pontos**, troca a vírgula por ponto. Vazio → `null`.
- **Mês** (`serialYM`, L1042): série entre 20000 e 80000 → `aaaa-mm` (UTC).
- **Data de vencimento** (`serialBR`, L1043): série ≥ 1000 → `dd/mm/aaaa`; o dia de vencimento `vd` são os 2 primeiros caracteres.
- **Exibição**: moeda `pt-BR` BRL com 2 casas (`R`), % com 1 casa (`P`), inteiros `pt-BR` (`N`), 1 casa (`N1`), formas curtas "R$ x,x mi / mil" (`fmtK`, `curto`, `mi`), data/hora `dd/mm/aaaa hh:mm` (`dtBR`) — L432–440.

---

## 3. Fluxo de carga e estado

1. `prep(BASE)` com a base embutida (L1175).
2. Se houver base salva no IndexedDB (`dados_v2`), ela substitui a embutida (L1179–1180).
3. Se houver referência de pasta salva (`pasta`) com permissão, relê a pasta; sem permissão, espera um clique para pedir (L1181–1194).
4. "Conectar pasta": `showDirectoryPicker({id:'topgc_leste',mode:'read'})` → salva a referência → `walk` (até 6 níveis de subpasta) → escolhe o arquivo → `parseWorkbook` → `aplicar` (salva a base inteira em `dados_v2`) → `prep` (L1146–1157, L1134–1139).
5. Alternativa: `<input webkitdirectory>` (até 8 níveis no caminho) e "Abrir planilha" (arquivo único) (L1158–1171).
6. `prep` calcula os campos derivados e chama `render` (L445–474); `render` redesenha tudo conforme o filtro (L1029–1037).

---

## 4. Dados embutidos (a remover na versão GitHub)

| # | Onde | O que contém | Linha |
|---|---|---|---|
| 1 | `BASE.rows` (`__DATA__` substituído na montagem) | Base completa: 202 matrículas com nome, bairro, município, classificação, carteira, valores mensais, saldos | L404 |
| 2 | `BASE.months` (`__MONTHS__`) | Meses do período | L404 |
| 3 | `BASE.meta` | Nome do arquivo de origem e data da base | L404 |
| 4 | Comentário do bloco | Nome do arquivo e data de recebimento | L403 |
| 5 | `AJUSTES` | 6 matrículas reais com prioridade, motivo e data do ajuste | L411–418 |
| 6 | `gaps()` quando `META.published` | 3 observações fixas da base de 30/10 (separador do Saldo PARC, contagem de matrículas com faturas que não batem, município/cliente específico) | L696–700 |
| 7 | IndexedDB `topgc_leste` / `kv` / `dados_v2` | **Cópia completa da última base carregada** no navegador | L1093–1098, L1136 |
| 8 | IndexedDB `topgc_leste` / `kv` / `pasta` | Referência à pasta (sem conteúdo) | L1151, L1181 |
| 9 | Logo base64 | Marca Águas do Rio (não é dado de cliente; **mantida** por decisão do usuário) | L313 |
| 10 | Arquivos auxiliares fora do HTML | `data.json`, `months.json`, planilhas de entrada, PDFs/Excel de exemplo, documento de prompt e documento do projeto — **não vão para o repositório** | — |

Não há uso de `localStorage` nem `sessionStorage`.

---

## 5. Código sem efeito (a remover, sem mudar resultado)

| Trecho | Motivo | Linha |
|---|---|---|
| `pendencias()` calcula `venc`, `clu`, `sit`, `cat`, `cls` | São descartados por `p.filter(k=>PEND[k])`, pois `PEND` só tem `cart`, `cort` e `pj` | L724–732 |
| Mapa `canon` de situações | Só serve à pendência `sit`, descartada | L464–466 |
| Tabela de críticas em `prio()` | `#tCrit` não existe na página; monta uma tabela solta | L666–669 |
| `(!SEL.mat.size||true)` em `msOpcoes('mun')` | Sempre verdadeiro | L486 |
| `fillMatList()` | Não é chamada | L520 |
| `const tt`, `const pct` em `charts()` | Não usadas | L535, L542 |

---

## 6. Versão 1.0.0 (GitHub Pages)

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Mesma marcação da original; barra de fonte com Conectar/Trocar pasta, Recarregar, Desconectar, Abrir planilha, Resumo executivo, Baixar base; `#srcInfo` (pasta, arquivos reconhecidos, data/hora da carga) e `#srcMsg` (avisos e erros) |
| `css/style.css` | CSS original sem alteração + 4 regras para os avisos da barra de fonte |
| `js/calculos.js` | Funções puras de leitura e cálculo (sem acesso à página); também carregável no Node para testes |
| `js/app.js` | Interface, estado vazio, leitura da pasta, exportações Excel/PDF |
| `img/logo-aguas-do-rio.png` | Logo (antes em base64 no HTML) |

Bibliotecas (cdnjs, versão fixa, SRI `sha512`): Chart.js 4.4.1 (`chart.umd.js`), SheetJS 0.18.5 (`xlsx.full.min.js`), jsPDF 2.5.1 (`jspdf.umd.min.js`, sob demanda).
O Chart.js usa `chart.umd.js` (o arquivo publicado no npm, já minificado) porque o `chart.umd.min.js` do cdnjs é regerado pelo cdnjs e não tem hash verificável a partir do pacote oficial.

Estado inicial: `prep({months:[],rows:[]})` → cartões e prioridades com "—", tabelas e gráficos vazios, aviso "Nenhuma pasta conectada", botões de exportação desativados.

Armazenamento: apenas IndexedDB `topgc_leste` / `kv` / `pasta` (referência da pasta, sem conteúdo). A chave antiga `dados_v2` é apagada ao abrir. Sem `localStorage`.

Reconhecimento dos arquivos na pasta (até 6 níveis de subpasta):
- **Ajustes**: arquivo .xlsx/.xls com "ajuste" no nome (o mais recente); precisa das colunas Matricula, Prioridade, Motivo, Data.
- **Base**: demais planilhas, na ordem de pontuação do nome e data; a primeira com o layout da aba "Top GC 15K" é usada; os outros arquivos aparecem como "não usados".
