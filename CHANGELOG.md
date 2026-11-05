# Changelog

## 1.3.0 — 05/11/2026

- Painel Interior Lagos: novo **filtro de Mês** (seleção múltipla, antes de Município). Faturado, arrecadado, % arrecadado, gráficos, médias, status de arrecadação, prioridade, Top 20, listas, Excel e PDF passam a usar só os meses marcados. Cards "do mês" e "Mês de referência" mostram o último mês marcado.
- Saldo de conta, parcelado, vencido e a vencer não mudam com o filtro (são a posição atual da base).
- Novas funções `recortarMeses` e `nomePeriodo` em `top100/js/calculos.js`; período não contínuo aparece como "jan, set, out/2026".
- Conferência com a base de 29/10/2026: sem filtro de mês, mesmos números da versão 1.2.0.

## 1.2.0 — 30/10/2026

- Botão **Baixar painel com números (HTML)** na página de introdução: escolhe o painel (Leste ou Interior Lagos) e a pasta, e baixa um arquivo .html único com o painel e os dados, para enviar por e-mail/Teams. Quem abre vê os números sem conectar pasta.
- O arquivo é montado no navegador a partir do próprio painel (mesmos cálculos); abre em "modo retrato", com aviso de que contém dados de clientes e sem os botões de pasta.
- `.gitignore` bloqueia arquivos de retrato (`TopGC_*_Painel_*.html`).

## 1.1.1 — 30/10/2026

- Link "‹ Painéis" no topo dos painéis Leste e Interior Lagos, para voltar à página de introdução.

## 1.1.0 — 30/10/2026

- Nova página de introdução no endereço principal ("Acompanhamento Grande Cliente"), no modelo da página "Painéis Top GC", com as caixas LESTE e INTERIOR LAGOS.
- Painel Leste passou para `/leste/` (sem mudança de visual ou cálculo).
- Novo painel **Top GC Interior Lagos v2.0** em `/top100/`, sem dados embutidos: abre vazio, conecta pasta, ajustes manuais pelo `ajustes.xlsx`, cálculos em `top100/js/calculos.js`. Removida a lista fixa de ajustes (matrículas do Leste) e o texto que a citava. Conferência com a base de 30/10/2026: diferença zero.
- Imagem de fundo da introdução como arquivo (`img/fundo-intro.webp`).

## 1.0.1 — 30/10/2026

- Ícone da aba do navegador trocado pelo símbolo "ae" azul da Águas do Rio (32, 192 e 180 px para celular).

## 1.0.0 — 30/10/2026

Primeira versão publicada no GitHub, a partir do painel original (artefato com dados embutidos).

- Removidos todos os dados embutidos: base de matrículas, meses, nome do arquivo de origem, lista de ajustes manuais e observações fixas da base de 30/10/2026.
- Painel abre vazio, com a estrutura visível, "—" nos cartões e o aviso "Nenhuma pasta conectada".
- Conexão de pasta: `showDirectoryPicker` (Chrome/Edge) com alternativa `webkitdirectory`; lê subpastas; botões Conectar/Trocar, Recarregar, Desconectar e Abrir planilha.
- Reconhecimento da base pelas colunas e dos ajustes manuais pelo nome (`ajuste`) e pelas colunas; erros dizem o que falta.
- Ajustes manuais passam a vir do arquivo `ajustes.xlsx` na pasta de dados.
- Não guarda dados no navegador; só a referência da última pasta. A cópia antiga da base (`dados_v2`) é apagada ao abrir.
- Aceita apenas .xlsx e .xls (CSV não funcionava com o cabeçalho de meses).
- Cálculos separados em `js/calculos.js` (funções puras), com a mesma lógica do original; código sem efeito removido.
- Código dividido em `index.html`, `css/`, `js/`, `img/`; logo como arquivo.
- jsPDF passou do jsdelivr para o cdnjs; Chart.js, SheetJS e jsPDF com versão fixa e SRI.
- Conferência com a base de 30/10/2026: diferença zero em todos os indicadores.
