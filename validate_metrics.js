const fs = require('fs');

const path = 'dados_planilha.csv';
const b = fs.readFileSync(path);

function decodeCsvText(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const hasUtf16Pattern = Array.from(bytes.slice(0, 200)).some((byte, index) => index % 2 === 1 && byte === 0);
  if (hasUtf16Pattern) return new TextDecoder('utf-16le').decode(bytes);
  const suspectMojibake = /├|┬|�|Ã|Â/.test(utf8Text);
  if (suspectMojibake) {
    try { return new TextDecoder('windows-1252').decode(bytes); } catch (e) { return String.fromCharCode.apply(null, Array.from(bytes)); }
  }
  return utf8Text;
}

function parseGoogleCsv(csvText) {
  const rows = [];
  const sanitized = String(csvText || '').replace(/^\uFEFF/, '');
  let current = '';
  let currentRow = [];
  let inQuotes = false;

  for (let i = 0; i < sanitized.length; i += 1) {
    const char = sanitized[i];
    if (char === '"') {
      if (inQuotes && sanitized[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && sanitized[i + 1] === '\n') i += 1;
      currentRow.push(current);
      if (currentRow.some((cell) => String(cell).trim() !== '')) rows.push(currentRow.map((cell) => cell.trim()));
      currentRow = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current || currentRow.length) {
    currentRow.push(current);
    if (currentRow.some((cell) => String(cell).trim() !== '')) rows.push(currentRow.map((cell) => cell.trim()));
  }

  return rows;
}

function repairMojibake(input) {
  if (!input || typeof input !== 'string') return input;
  try {
    // Try reinterpret binary/latin1 bytes as UTF-8
    const b = Buffer.from(input, 'binary');
    const asUtf8 = b.toString('utf8');
    if (/[áàãâéíóúçÁÀÃÂÉÍÓÚÇ]/.test(asUtf8)) return asUtf8;
    const asLatin1 = Buffer.from(input, 'latin1').toString('utf8');
    if (/[áàãâéíóúçÁÀÃÂÉÍÓÚÇ]/.test(asLatin1)) return asLatin1;
  } catch (e) {}
  try {
    const fixed = decodeURIComponent(escape(input));
    if (/[áàãâéíóúçÁÀÃÂÉÍÓÚÇ]/.test(fixed)) return fixed;
  } catch (e) {}
  const map = {'Ã§':'ç','Ã£':'ã','Ã¡':'á','Ã©':'é','Ãª':'ê','Ãº':'ú','Ã³':'ó','Ã´':'ô','ï»¿':''};
  let out = input;
  Object.keys(map).forEach(k => { out = out.split(k).join(map[k]); });
  return out;
}

function normalizeNumber(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return 0;
  const value = String(rawValue).trim();
  const withoutPercent = value.replace('%', '').trim();
  const cleaned = withoutPercent.replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePercent(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return 0;
  const value = String(rawValue).trim();
  const cleaned = value.replace('%', '').replace('.', '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeServiceRows(rows) {
  const serviceRows = rows.filter((row) => {
    if (!row || row.length < 6) return false;
    const firstCell = String(row[0] || '').trim();
    if (!firstCell) return false;
    const lowered = firstCell.toLowerCase();
    return !lowered.includes('atividade') && !lowered.includes('chuva') && !lowered.includes('total') && !lowered.includes('periodo') && !lowered.includes('navegação');
  });

  return serviceRows
    .map((row) => {
      const meaningfulCells = row.filter((cell) => String(cell).trim() !== '');
      const lastThree = meaningfulCells.slice(-3);
      let name = String(row[0] || '').trim();
      name = name.replace(/^\uFEFF/, '').replace(/^ï»¿/, '').trim();
      if (/Ã|Â|â|â”|ï»|Ã§/.test(name)) {
        try { name = decodeURIComponent(escape(name)); } catch (e) { /* ignore */ }
      }
      const cumulative = normalizeNumber(lastThree[0]);
      const target = normalizeNumber(lastThree[1]);
      const percent = parsePercent(lastThree[2]);
      return { name, cumulative, target, percent };
    })
    .filter((item) => {
      if (!item || !item.name) return false;
      const nm = item.name.replace(/^[^A-Za-z0-9]*/, '').replace(/[^A-Za-z0-9].*$/, '').trim();
      if (nm.length < 3) return false;
      if (/^[\d\W_]+$/.test(item.name)) return false;
      if (/^ï»¿$/i.test(item.name)) return false;
      if (item.target === 0) return false;
      return true;
    });
}

const csv = decodeCsvText(b.buffer);
const rows = parseGoogleCsv(csv);
const services = normalizeServiceRows(rows);

console.log('rowsTotal', rows.length);
console.log('serviceRows', services.length);
console.log('sample', services.slice(0, 6));
if (services.length) {
  const avg = services.reduce((s, it) => s + it.percent, 0) / services.length;
  console.log('avg%', avg);
  console.log('>=100', services.filter(i => i.percent >= 100).length);
  console.log('>100', services.filter(i => i.percent > 100).length);
  console.log('90-99', services.filter(i => i.percent >= 90 && i.percent < 100).length);
  console.log('<90', services.filter(i => i.percent < 90).length);
}
