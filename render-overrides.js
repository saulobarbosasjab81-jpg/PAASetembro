(function(){
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
        <td></td>`;
      serviceTableBody.appendChild(br);

      // Executivo row (second row)
      const er = document.createElement('tr');
      er.className = 'exec-row';
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
        <td>${s.status ?? ''}</td>`;
      serviceTableBody.appendChild(er);
    });
  }
  window.renderTable = renderTable;
})();
