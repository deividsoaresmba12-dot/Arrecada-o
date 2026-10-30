# Changelog

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
