const fs = require('fs');
const path = 'C:/Users/saulo/Desktop/dashboard_missao_setembro_26/dados_planilha.csv';
const buffer = fs.readFileSync(path);
const text = buffer.toString('utf8').replace(/^\uFEFF/, '');

function parseCsv(csvText) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const ch = csvText[i];
    if (ch === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && csvText[i + 1] === '\n') i += 1;
      row.push(current);
      if (row.some((cell) => String(cell).trim() !== '')) {
        rows.push(row.map((cell) => String(cell).trim()));
      }
      row = [];
      current = '';
      continue;
    }

    current += ch;
  }

  if (current || row.length) {
    row.push(current);
    if (row.some((cell) => String(cell).trim() !== '')) {
      rows.push(row.map((cell) => String(cell).trim()));
    }
  }

  return rows;
}

function normalizeNumber(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;
  const value = String(raw).trim();
  const cleaned = value.replace('%', '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePercent(raw) {
  if (raw === undefined || raw === null || raw === '') return 0;
  const value = String(raw).trim();
  const cleaned = value.replace('%', '').replace('.', '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

const rows = parseCsv(text);
const serviceRows = rows.filter((row) => {
  if (!row || row.length < 6) return false;
  const first = String(row[0] || '').trim();
  if (!first) return false;
  const lower = first.toLowerCase();
  return !lower.includes('atividade') && !lower.includes('chuva') && !lower.includes('total') && !lower.includes('periodo');
});

const mapped = serviceRows.slice(0, 10).map((row) => {
  const name = repairMojibake(String(row[0]).trim());
  const lastThree = row.slice(-3);
  const cumulative = normalizeNumber(lastThree[0]);
  const target = normalizeNumber(lastThree[1]);
  const percent = parsePercent(lastThree[2]);
  const actual = cumulative || 0;
  return { name, cumulative, target, percent, actual };
});

console.log('rows_total=', rows.length);
console.log('first_service_rows=', serviceRows.slice(0, 5).map((row) => row[0]));
console.log(JSON.stringify(mapped, null, 2));

function repairMojibake(input) {
  if (!input || typeof input !== 'string') return input;
  // Quick try: decode latin1-encoded bytes as UTF-8
  try {
    const buf = Buffer.from(input, 'binary');
    const asUtf8 = buf.toString('utf8');
    if (/[áàãâéíóúçÁÀÃÂÉÍÓÚÇ]/.test(asUtf8)) return asUtf8;
    const asUtf8Latin1 = Buffer.from(input, 'latin1').toString('utf8');
    if (/[áàãâéíóúçÁÀÃÂÉÍÓÚÇ]/.test(asUtf8Latin1)) return asUtf8Latin1;
  } catch (e) {}

  // Fallback mapping for common mojibake sequences
  const map = {
    'Ã§':'ç','Ã£':'ã','Ã¡':'á','Ã©':'é','Ãª':'ê','Ãº':'ú','Ã³':'ó','Ã´':'ô','ï»¿':'',
    'â”œÂºâ”œÃºo': 'ção', 'â”œÂºâ”œÃº': 'ção', 'â”œÃrea': 'área', 'pâ”œÃtio': 'pátio'
    'â”œ':'ç','â”˜':'í','â”º':'ó','Âº':'º','Âª':'ª'
  };
  let out = input;
  Object.keys(map).forEach(k => { out = out.split(k).join(map[k]); });
  return out;
}
