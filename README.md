# Dashboard de Missão - Setembro/26

Dashboard estático para acompanhar a missão de setembro de 2026 com indicadores principais, status dos serviços, evolução comparativa e produção diária.

## Como usar

1. Abra o arquivo `index.html` em um navegador, ou rode um servidor local.
2. Para conectar a uma planilha-mãe do Google Sheets, atualize a URL CSV no arquivo `app.js` na variável `state.googleSheetCsv`.
3. O painel usa dados locais por padrão como fallback, e o carregamento da planilha pode ser ajustado conforme a estrutura da sua base.

## Exemplo de CSV do Google Sheets

Se a planilha for pública, normalmente é possível usar um endpoint do tipo:

`https://docs.google.com/spreadsheets/d/SEU_ID/export?format=csv&gid=0`

Substitua a variável abaixo:

```js
state.googleSheetCsv = 'https://docs.google.com/spreadsheets/d/SEU_ID/export?format=csv&gid=0';
```

## Estrutura recomendada para a planilha-mãe

- Nome do serviço
- Acumulado
- Meta
- Desvio
- Situação
- Período
- Última atualização

## Como rodar localmente

```bash
cd dashboard_missao_setembro_26
python -m http.server 8000
```

Depois acesse:

`http://localhost:8000`

## Observação

Este modelo foi construído para servir como base visual e operacional. Para deixar o dashboard totalmente conectado à planilha-mãe, basta alinhar os nomes das colunas e adaptar o parser do arquivo `app.js`.
