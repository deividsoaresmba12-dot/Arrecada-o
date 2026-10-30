# Acompanhamento GC Leste — Top GC 15K

Painel de faturamento, arrecadação e cobrança das matrículas Top GC 15K da Superintendência Leste.

**O painel abre vazio.** Não há nenhum dado no repositório. As informações aparecem só depois que você conecta uma pasta do seu computador com a planilha. Tudo é processado **no seu navegador**: nenhum dado é enviado para servidor, e nenhum dado é salvo no navegador. O painel guarda apenas a referência da última pasta conectada, sem o conteúdo, para facilitar a próxima abertura; o botão **Desconectar** apaga essa referência.

Versão atual: **1.0.0** (ver [CHANGELOG](CHANGELOG.md)).

## Como usar

1. Abra o painel (GitHub Pages do repositório).
2. Clique em **Conectar pasta** e escolha a pasta onde está a planilha (pode ser a pasta do SharePoint sincronizada pelo OneDrive). Subpastas também são lidas.
3. O navegador pede permissão de leitura. Depois disso o painel mostra:
   - o nome da pasta e a data/hora da carga;
   - qual arquivo foi usado como base e qual foi usado como ajustes manuais;
   - avisos de colunas opcionais que estejam faltando.
4. Botões:
   - **Recarregar**: lê a pasta de novo (use depois de atualizar a planilha).
   - **Trocar pasta**: escolhe outra pasta.
   - **Desconectar**: limpa a tela e esquece a pasta.
   - **Abrir planilha**: alternativa sem conectar pasta; escolha a planilha (e, se quiser, o `ajustes.xlsx`).
   - **Resumo executivo** (PDF de 1 página) e **Baixar base (Excel)**: gerados no próprio navegador.

Na próxima vez que abrir o painel, ele mostra a última pasta usada; clique em **Recarregar** para permitir a leitura de novo.

## Navegadores compatíveis

| Navegador | Conectar pasta | Observação |
|---|---|---|
| Google Chrome 86+ / Microsoft Edge 86+ (computador) | Sim, com o seletor de pasta e lembrando a última pasta | Recomendado |
| Firefox, Safari, Opera e outros | Sim, pelo modo alternativo (seleção de pasta do sistema) | Não lembra a pasta; escolha de novo a cada abertura |
| Celular / tablet | Use **Abrir planilha** | A visualização é adaptada à tela |

É preciso internet para carregar as bibliotecas (Chart.js, SheetJS, jsPDF) e as fontes.

## Estrutura esperada da pasta de dados

```
Minha pasta/
├── GC_top_15k__LEST.xlsx      ← base (obrigatória)
├── ajustes.xlsx               ← ajustes manuais de prioridade (opcional)
└── (subpastas e outros arquivos são permitidos)
```

### Base (obrigatória)

- Formato **.xlsx** ou **.xls**. Arquivos temporários (`~$…`) são ignorados.
- Se houver várias planilhas, o painel prefere nomes com `15K`, depois `GC`/`TOP`, depois `LEST`, e em seguida a mais recente.
- O painel usa a **primeira aba** cujo cabeçalho (nas 15 primeiras linhas) tenha as colunas `Matricula` e `Saldo de Conta` — na base atual, a aba **Top GC 15K**.
- Nomes de coluna são comparados sem acento e sem diferenciar maiúsculas.

**Colunas obrigatórias**

| Coluna | Conteúdo |
|---|---|
| `Matricula` | Número com 5 ou mais dígitos (linhas sem isso são ignoradas) |
| `CIDADE` | Município |
| `CLASSIFICACAO` | Classificação GC |
| Colunas de meses do faturamento | Cabeçalho com **data** (ex.: 01/01/2026), entre `Data de Vencimento` e o 1º `Total Geral` |
| `Total Geral` (1º) | Fecha o bloco de faturamento |
| Colunas de meses da arrecadação | Cabeçalho com **data**, entre os dois `Total Geral` |
| `Total Geral` (2º) | Fecha o bloco de arrecadação |
| `QTD faturas` | Quantidade de faturas |
| `Saldo de Conta` | Saldo de conta (R$) |

**Colunas opcionais** (se faltarem, o painel avisa e o campo fica vazio ou zerado):
`Nome`, `CATEGORIA`, `SUB_CATEGORIA`, `QTD ECONOMIA`, `SIT_LIGAÇÃO`, `Carteira`, `MACROCLUSTER.CURVA CLIENTE`, `MACROCLUSTER.MACRO CLUSTER`, `NOM_BAIRRO`, `Data de Vencimento`, `NFC`, `NFA`, `PARC`, `Saldo PARC`, `Faturamento` e `Arrecadação` (do mês, depois de `Saldo de Conta`), `Dia Médio de Pagto`, `Média Dias Pagto x Vencto`, `Status Arrecadação`.

> Atenção: sem `Saldo PARC`, `NFC` e `NFA` a prioridade é calculada com saldo parcelado zero e com `QTD faturas`.

### Ajustes manuais (opcional)

Arquivo com **"ajuste" no nome** (ex.: `ajustes.xlsx`), com uma aba que tenha estas colunas:

| Matricula | Prioridade | Motivo | Data |
|---|---|---|---|
| número da matrícula | CRÍTICA, ALTA, MÉDIA, BAIXA ou REGULAR | texto livre | data do ajuste |

A prioridade informada substitui a calculada; a lista de matrículas mostra a etiqueta "ajuste manual" e a prioridade que a regra daria. Se o arquivo tiver erro, o painel carrega a base sem ajustes e mostra o problema.

## Regras de cálculo

Ver [docs/CALCULOS.md](docs/CALCULOS.md). Estrutura do código: [docs/CONSTRUCAO.md](docs/CONSTRUCAO.md).

## Estrutura do repositório

```
index.html          página
css/style.css       estilo
js/calculos.js      cálculos (funções puras, sem interface)
js/app.js           interface, leitura da pasta, exportações
img/                logo
docs/               documentação
```

## Privacidade

- Nenhum dado de clientes fica no repositório. O `.gitignore` bloqueia planilhas (`*.xlsx`, `*.xls`, `*.csv`) e pastas de dados.
- Não usa `localStorage`/`sessionStorage`. O IndexedDB guarda só a referência da pasta (`topgc_leste` / `pasta`).
- Bibliotecas carregadas do cdnjs com versão fixa e verificação de integridade (SRI).
