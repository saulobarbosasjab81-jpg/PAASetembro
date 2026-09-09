(function(){
  function renderTable() {
    if (typeof serviceTableBody === 'undefined') return;
    serviceTableBody.innerHTML = '';
    (state.services || []).forEach(s => {
      const name = s.name || '';
      const baselineAcum = s.baselineAcquired ?? '';
      const baselinePercent = (typeof s.baselinePercent === 'number') ? s.baselinePercent : (s.baselineMetaPercent ?? '');
      const execAcum = s.acquired ?? '';
      const execMeta = s.meta ?? '';
      const execPercent = (typeof s.progress === 'number') ? s.progress : (execAcum && execMeta ? Math.round((Number(execAcum) / Number(execMeta)) * 100) : 0);

      const br = document.createElement('tr');
      br.className = 'baseline-row';
      br.innerHTML = `<td class="service-name">${name}</td>
        <td>${baselineAcum}</td>
        <td>${s.meta ?? ''}</td>
        <td></td>
        <td>
          <div class="progress baseline">
            <div class="progress-fill" style="width:${baselinePercent || 0}%;"></div>
            <span class="progress-label">${baselinePercent ? baselinePercent + '%' : ''}</span>
          </div>
        </td>
        <td></td>`;
      serviceTableBody.appendChild(br);

      const er = document.createElement('tr');
      er.className = 'exec-row';
      er.innerHTML = `<td class="service-name exec-name">↳ Executivo</td>
        <td>${execAcum}</td>
        <td>${execMeta}</td>
        <td></td>
        <td>
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
