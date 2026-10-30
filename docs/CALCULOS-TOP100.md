# Cálculos do painel Top GC Interior Lagos (pasta `top100/`)

Mesma lógica do painel original "Top GC Interior Lagos v2.0". Regras iguais às do Leste ([CALCULOS.md](CALCULOS.md)) nos pontos abaixo:

- % arrecadado, teto de MÉDIA para quem arrecadou ≥ 95%, faixas de prioridade e ajuste manual (arquivo `ajustes.xlsx` na pasta);
- status de arrecadação, pendências cadastrais exibidas (sem carteira, cortada faturando, PJ residencial);
- filtros, gráfico Faturamento x Arrecadação, Pareto por macro cluster, tabelas, Top 20, janela de detalhe, Excel por nível e PDF.

Funções em `top100/js/calculos.js`: `lerAba`, `enriquecer`, `lerAjustes`, `classificar`, `statusArr`, `pendencias`, `preparar`, `passa`.

## Diferenças em relação ao Leste

### Leitura da aba "Top GC" (`lerAba`)

| Item | Regra |
|---|---|
| Cabeçalho | Linha (nas 15 primeiras) com `MATRICULA` e uma coluna de saldo: `TOTAL VENCIDO`, `SALDO VENCIDO` ou `SALDO TOTAL` |
| Obrigatórias | MATRICULA, CIDADE, CLASSIFICAÇÃO, coluna de saldo, `FAT. REF.01…` e `Arrec Ref.01…` |
| Nome do cliente | Coluna `CLIENTE` |
| Meses | Colunas `FAT. REF.NN` e `Arrec Ref.NN` (NN = mês 01 a 12); vazio = 0 |
| Ano dos meses | Ano mais frequente da coluna `DATA LEITURA`; sem ela, o ano atual |
| Saldo vencido (`tv`) | `SALDO VENCIDO` como veio; ou `SALDO TOTAL − Saldo PARC` (mínimo 0); ou `TOTAL VENCIDO` como veio |
| Saldo de conta (`s`) | `SALDO TOTAL` quando existir; senão `saldo vencido + Saldo PARC` |
| Qtd faturas (`q`) | `NFC + NFA + PARC` |
| Faturas em aberto (`qv`) | `NFC + NFA` (sem a alternativa `QTD faturas` do Leste) |
| Faturado/Arrecadado do mês | Valores do último mês com lançamento |
| Pontualidade | Coluna `STATUS` (Pago, Em Dia, Vencida); ação: coluna `AÇÃO` |
| Dias pagto x venc. | Coluna `MÉDIA DIAS PAGAMENTO`, 1 casa decimal |

### Complemento por outras abas (`enriquecer`)

- **Base Fat2**: bairro (`NOME DO BAIRRO`) e faturas por referência (`VALOR PARCELA`, `DATA DE VENCIMENTO`).
- **Base Arrecadação**: dia médio de pagamento (média dos dias de `DATA PAGTO.` no ano da base, 1 casa) e pagamentos por referência (`REF. PAGA`, `VALOR PAGO`).
- **Base Saldo**: `SALDO TOTAL` por matrícula, quando a aba "Top GC" traz `SALDO VENCIDO`.
- **A vencer** = faturas sem pagamento (pago < 99% do valor) com vencimento a partir do dia seguinte ao último pagamento registrado (sem pagamentos: hoje), limitado ao saldo total. O saldo de conta passa a ser `parcelado + a vencer + vencido`.
- Se essas abas não existirem ou derem erro, o painel usa só a aba "Top GC" (como o original).

### Derivados (`preparar`)

- `sv` = saldo vencido lido (`tv`); só se não houver, `max(0, s − sp)`.
- Mês parcial: conta matrículas com faturado **diferente de zero** no último mês (no Leste: não vazio).

## Decisões

- Comportamento mantido igual ao original (conferência de 30/10/2026: diferença zero nos indicadores, listas, Excel e PDF).
- Removida a lista fixa de 6 matrículas de ajuste (eram do Leste e não existiam nesta base). Os ajustes vêm do `ajustes.xlsx` da pasta.
