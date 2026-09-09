const DEFAULT_CONFIG = {
  lastUpdate: '09/09/2026',
  googleSheetCsv: 'dados_planilha.csv',
  summary: [
    { label: 'Período', value: '14/09–11/10', meta: '28 dias úteis', accent: 'green', icon: 'P' },
    { label: 'Produção', value: '0%', meta: 'média da missão', accent: 'blue', icon: 'Σ' },
    { label: 'Concluídos', value: '0', meta: 'serviços concluídos', accent: 'green', icon: '✓' },
    { label: 'Adiantados', value: '0', meta: 'acima da referência', accent: 'blue', icon: '↗' },
    { label: 'Atrasados', value: '0', meta: 'fora do plano', accent: 'red', icon: '!' },
  ],
  progress: {
    planned: [40, 48, 55, 62, 70, 78, 84, 90, 100],
    actual: [38, 46, 52, 60, 65, 71, 79, 88, 94],
    labels: ['D1', 'D4', 'D7', 'D10', 'D14', 'D18', 'D22', 'D26', 'D30'],
  },
  status: [
    { name: 'Concluído', value: 0, color: '#2dd4bf' },
    { name: 'Adiantado', value: 0, color: '#60a5fa' },
    { name: 'Risco', value: 0, color: '#fbbf24' },
    { name: 'Atrasado', value: 0, color: '#f87171' },
  ],
  services: [],
  daily: [
    { date: '01', value: 36 },
    { date: '04', value: 52 },
    { date: '07', value: 68 },
    { date: '10', value: 79 },
    { date: '13', value: 88 },
    { date: '16', value: 96 },
    { date: '19', value: 110 },
    { date: '22', value: 121 },
    { date: '25', value: 134 },
    { date: '28', value: 148 },
  ],
};

const state = { ...DEFAULT_CONFIG };

const kpiNode = document.getElementById('kpis');
const serviceTableBody = document.getElementById('serviceTableBody');
const statusLegend = document.getElementById('statusLegend');
const progressChart = document.getElementById('progressChart');
const statusDonut = document.getElementById('statusDonut');
const dailyProduction = document.getElementById('dailyProduction');
const lastUpdateNode = document.getElementById('last-update');
const refreshButton = document.getElementById('refresh-btn');

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

function decodeCsvText(buffer) {
  const bytes = new Uint8Array(buffer);

  // BOM for UTF-16 LE
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes);
  }

  // Try UTF-8 first
  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

  // Heuristic: many zero-bytes in odd positions => likely UTF-16LE
  const hasUtf16Pattern = Array.from(bytes.slice(0, 200)).some((byte, index) => index % 2 === 1 && byte === 0);
  if (hasUtf16Pattern) {
    return new TextDecoder('utf-16le').decode(bytes);
  }

  // Heuristic: mojibake sequences often appear when CP1252/Latin1 text is interpreted as UTF-8
  const suspectMojibake = /├|┬|�|Ã|Â/.test(utf8Text);
  if (suspectMojibake) {
    try {
      return new TextDecoder('windows-1252').decode(bytes);
    } catch (e) {
      // Fallback: interpret as ISO-8859-1 by mapping bytes one-to-one to codepoints
      return String.fromCharCode.apply(null, Array.from(bytes));
    }
  }

  return utf8Text;
}

function formatNumber(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString('pt-BR') : value.toFixed(1).replace('.', ',');
  }
  return value;
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
      if (inQuotes && csvText[i + 1] === '"') {
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
      if (char === '\r' && csvText[i + 1] === '\n') i += 1;
      currentRow.push(current);
      if (currentRow.some((cell) => String(cell).trim() !== '')) {
        rows.push(currentRow.map((cell) => cell.trim()));
      }
      currentRow = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current || currentRow.length) {
    currentRow.push(current);
    if (currentRow.some((cell) => String(cell).trim() !== '')) {
      rows.push(currentRow.map((cell) => cell.trim()));
    }
  }

  return rows;
}

function getBadgeClass(status) {
  if (status === 'ok') return 'ok';
  if (status === 'warn') return 'warn';
  if (status === 'danger') return 'danger';
  return 'info';
}

function renderKPIs() {
  const cards = state.summary
    .map((item) => {
      const accentClass = item.accent === 'green' ? 'var(--green)' : item.accent === 'red' ? 'var(--red)' : item.accent === 'blue' ? 'var(--blue)' : 'var(--amber)';

      return `
        <article class="kpi-card">
          <div class="kpi-label">
            <span>${item.label}</span>
            <span class="icon" style="background:${accentClass};">${item.icon}</span>
          </div>
          <div class="kpi-value">${item.value}</div>
          <div class="kpi-foot">${item.meta}</div>
        </article>
      `;
    })
    .join('');

  kpiNode.innerHTML = cards;
}

function drawProgressChart() {
  const { planned, actual, labels } = state.progress;
  const width = 620;
  const height = 240;
  const padding = { top: 20, right: 24, bottom: 36, left: 32 };
  const max = 100;

  const xStep = (width - padding.left - padding.right) / (labels.length - 1);
  const yFor = (value) => height - padding.bottom - ((value / max) * (height - padding.top - padding.bottom));

  const plannedPath = planned
    .map((value, index) => `${index === 0 ? 'M' : 'L'} ${padding.left + index * xStep} ${yFor(value)}`)
    .join(' ');

  const actualPath = actual
    .map((value, index) => `${index === 0 ? 'M' : 'L'} ${padding.left + index * xStep} ${yFor(value)}`)
    .join(' ');

  const xAxis = labels
    .map((label, index) => {
      const x = padding.left + index * xStep;
      return `
        <line x1="${x}" y1="${height - padding.bottom}" x2="${x}" y2="${height - padding.bottom + 6}" stroke="rgba(255,255,255,0.15)" />
        <text x="${x}" y="${height - 10}" text-anchor="middle" fill="#9db1ce" font-size="11">${label}</text>
      `;
    })
    .join('');

  const yGrid = [0, 25, 50, 75, 100]
    .map((tick) => {
      const y = yFor(tick);
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.08)" />
        <text x="10" y="${y + 4}" fill="#9db1ce" font-size="10">${tick}%</text>
      `;
    })
    .join('');

  progressChart.innerHTML = `
    <defs>
      <linearGradient id="plannedLine" x1="0" x2="1">
        <stop offset="0%" stop-color="#a78bfa" />
        <stop offset="100%" stop-color="#c4b5fd" />
      </linearGradient>
      <linearGradient id="actualLine" x1="0" x2="1">
        <stop offset="0%" stop-color="#60a5fa" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
    </defs>
    ${yGrid}
    <path d="${plannedPath}" fill="none" stroke="url(#plannedLine)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${actualPath}" fill="none" stroke="url(#actualLine)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    ${xAxis}
  `;
}

function drawStatusDonut() {
  const total = state.status.reduce((sum, item) => sum + item.value, 0);
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  document.getElementById('statusTotal').textContent = total;

  const segments = state.status
    .map((item) => {
      const fraction = total === 0 ? 0 : item.value / total;
      const dash = fraction * circumference;
      const segment = `
        <circle
          cx="110"
          cy="110"
          r="${radius}"
          fill="none"
          stroke="${item.color}"
          stroke-width="24"
          stroke-dasharray="${dash} ${circumference - dash}"
          stroke-dashoffset="${-offset}"
          stroke-linecap="round"
        />
      `;
      offset += dash;
      return segment;
    })
    .join('');

  statusDonut.innerHTML = segments;

  statusLegend.innerHTML = state.status
    .map((item) => `
      <div class="legend-item">
        <div class="left">
          <span class="swatch" style="background:${item.color};"></span>
          <span>${item.name}</span>
        </div>
        <strong>${item.value}</strong>
      </div>
    `)
    .join('');
}

function renderTable() {
  serviceTableBody.innerHTML = state.services
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.acquired}</td>
          <td>${item.target}</td>
          <td>${item.deviation}</td>
          <td><span class="badge ${getBadgeClass(item.status)}">${item.status === 'ok' ? 'OK' : item.status === 'warn' ? 'Atenção' : item.status === 'danger' ? 'Crítico' : 'Info'}</span></td>
        </tr>
      `
    )
    .join('');
}

function renderDailyBars() {
  const max = Math.max(...state.daily.map((day) => day.value));

  dailyProduction.innerHTML = state.daily
    .map((day) => {
      const height = (day.value / max) * 100;
      return `
        <div class="daily-bar">
          <div class="value">${day.value}</div>
          <div class="bar" style="height:${height}%;"></div>
          <div class="date">D${day.date}</div>
        </div>
      `;
    })
    .join('');
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

      // Strip common BOM remnants and whitespace
      name = name.replace(/^\uFEFF/, '').replace(/^ï»¿/, '').trim();

      // Attempt to fix mojibake by reinterpreting Latin1 sequences
      if (/Ã|Â|â|â”|ï»|Ã§/.test(name)) {
        try {
          // decodeURIComponent(escape(...)) is a common browser trick to fix Latin1->UTF8
          // eslint-disable-next-line no-undef
          name = decodeURIComponent(escape(name));
        } catch (e) {
          // ignore and keep original
        }
      }

      const cumulative = normalizeNumber(lastThree[0]);
      const target = normalizeNumber(lastThree[1]);
      const percent = parsePercent(lastThree[2]);
      const actual = cumulative || 0;
      const deviation = percent - 100;
      const status = percent >= 100 ? 'ok' : percent >= 90 ? 'warn' : 'danger';

      return {
        name,
        acquired: formatNumber(actual),
        target: formatNumber(target),
        deviation: `${deviation >= 0 ? '+' : ''}${deviation.toFixed(1).replace('.', ',')} pp`,
        status,
        percentage: percent,
      };
    })
    .filter((item) => {
      if (!item) return false;
      if (!item.name) return false;
      // Reject names that are just BOM remnants, very short, purely numeric or punctuation
      const nm = item.name.replace(/^[^\p{L}\p{N}]*/u, '').replace(/[^\p{L}\p{N}].*$/u, '').trim();
      if (nm.length < 3) return false;
      if (/^[\d\W_]+$/.test(item.name)) return false;
      if (/^ï»¿$/i.test(item.name)) return false;
      if (item.target === '0' || item.target === 0) return false;
      return true;
    });
}

function applyMetricsFromServices(serviceItems) {
  const average = serviceItems.length
    ? serviceItems.reduce((sum, item) => sum + item.percentage, 0) / serviceItems.length
    : 0;

  const concluido = serviceItems.filter((item) => item.percentage >= 100).length;
  const adiantado = serviceItems.filter((item) => item.percentage > 100).length;
  const risco = serviceItems.filter((item) => item.percentage >= 90 && item.percentage < 100).length;
  const atrasado = serviceItems.filter((item) => item.percentage < 90).length;

  state.summary = [
    { label: 'Período', value: '14/09–11/10', meta: '28 dias úteis', accent: 'green', icon: 'P' },
    { label: 'Produção', value: `${average.toFixed(1).replace('.', ',')}%`, meta: 'média da missão', accent: 'blue', icon: 'Σ' },
    { label: 'Concluídos', value: String(concluido), meta: 'serviços concluídos', accent: 'green', icon: '✓' },
    { label: 'Adiantados', value: String(adiantado), meta: 'acima da referência', accent: 'blue', icon: '↗' },
    { label: 'Atrasados', value: String(atrasado), meta: 'fora do plano', accent: 'red', icon: '!' },
  ];

  state.status = [
    { name: 'Concluído', value: concluido, color: '#2dd4bf' },
    { name: 'Adiantado', value: adiantado, color: '#60a5fa' },
    { name: 'Risco', value: risco, color: '#fbbf24' },
    { name: 'Atrasado', value: atrasado, color: '#f87171' },
  ];

  state.services = serviceItems.slice(0, 12).map(({ name, acquired, target, deviation, status }) => ({
    name,
    acquired,
    target,
    deviation,
    status,
  }));
}

async function loadData() {
  const sheetCsv = state.googleSheetCsv;
  if (!sheetCsv) {
    renderAll();
    return;
  }

  try {
    const response = await fetch(sheetCsv, { cache: 'no-store' });
    if (!response.ok) throw new Error('Erro ao carregar planilha');

    const csv = decodeCsvText(await response.arrayBuffer());
    const rows = parseGoogleCsv(csv);

    if (!rows.length) throw new Error('Planilha vazia');

    const serviceItems = normalizeServiceRows(rows);
    if (serviceItems.length) {
      applyMetricsFromServices(serviceItems);
      const lastRow = rows[rows.length - 1] || [];
      const possibleDate = lastRow.find((value) => /\d{2}\/\d{2}\/\d{2}/.test(String(value)));
      if (possibleDate) {
        state.lastUpdate = possibleDate;
      }
    }
  } catch (error) {
    console.warn('Fallback para dados locais:', error);
  }

  renderAll();
}

function renderAll() {
  lastUpdateNode.textContent = `Última atualização: ${state.lastUpdate}`;
  renderKPIs();
  drawProgressChart();
  drawStatusDonut();
  renderTable();
  renderDailyBars();
}

refreshButton.addEventListener('click', () => {
  loadData();
});

loadData();
