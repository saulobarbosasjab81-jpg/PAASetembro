(function(){
  function badgeClassFor(p) {
    if (p === null || p === undefined || p === '') return 'info';
    const n = Number(p);
    if (isNaN(n)) return 'info';
    if (n >= 100) return 'ok';
    if (n >= 90) return 'warn';
    return 'danger';
  }

  function renderTable() {
    if (typeof serviceTableBody === 'undefined') return;
    serviceTableBody.innerHTML = '';
    (state.services || []).forEach(s => {
      const name = s.name || '';
      const baselineAcum = s.baselineAcquired ?? '';
      const baselinePercent = (typeof s.baselinePercent === 'number') ? s.baselinePercent : (s.baselineMetaPercent ?? 0);
      const baselineMeta = s.baselineMeta ?? s.meta ?? '';
      const execAcum = s.acquired ?? '';
      const execMeta = s.meta ?? '';
      const execPercent = (typeof s.progress === 'number') ? s.progress : (execAcum && execMeta ? Math.round((Number(execAcum) / Number(execMeta)) * 100) : 0);

      // Baseline row (first row) with service name spanning two rows
      const br = document.createElement('tr');
      br.className = 'baseline-row';
        const baseCls = badgeClassFor(baselinePercent);
        const baseBadgeText = (baselinePercent || baselinePercent === 0) ? `Planejado — ${baselinePercent}%` : 'Planejado';
        br.innerHTML = `<td class="service-name" rowspan="2">${name}</td>
        <td>${baselineAcum}</td>
        <td>${baselineMeta}</td>
        <td></td>
        <td>
          <div class="row-label">Planejado</div>
          <div class="progress baseline">
            <div class="progress-fill" style="width:${baselinePercent || 0}%;"></div>
            <span class="progress-label">${baselinePercent ? baselinePercent + '%' : ''}</span>
          </div>
        </td>
          <td><span class="badge ${baseCls}">${baseBadgeText}</span></td>`;
      serviceTableBody.appendChild(br);

      // Executivo row (second row)
      const er = document.createElement('tr');
      er.className = 'exec-row';
        const execCls = badgeClassFor(execPercent);
        const execBadgeText = (execPercent || execPercent === 0) ? `Executado — ${execPercent}%` : 'Executado';
        er.innerHTML = `<td>${execAcum}</td>
        <td>${execMeta}</td>
        <td></td>
        <td>
          <div class="row-label">Executado</div>
          <div class="progress">
            <div class="progress-fill" style="width:${execPercent}%;"></div>
            <span class="progress-label">${execPercent}%</span>
          </div>
        </td>
          <td><span class="badge ${execCls}">${execBadgeText}</span></td>`;
      serviceTableBody.appendChild(er);
    });
  }
  window.renderTable = renderTable;
})();
