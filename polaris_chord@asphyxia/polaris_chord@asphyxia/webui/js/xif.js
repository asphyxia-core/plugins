/* Front-end logic for the xif@asphyxia console page */

function xifToast(message, isError) {
  const $t = $('#xif-toast');
  $t.text(message)
    .removeClass('is-success is-danger')
    .addClass(isError ? 'is-danger' : 'is-success')
    .show();
  setTimeout(function () {
    $t.hide();
  }, 4000);
}

function xifRender(s) {
  if (!s || !s.ok) {
    $('#xif-loading').text((s && s.message) || 'No player data found').addClass('is-danger');
    return;
  }
  $('#xif-loading').hide();
  $('#xif-panel').show();
  $('#xif-name').text(s.name || '(unnamed)');
  $('#xif-meta').text('rank ' + s.rank + ' / exp ' + s.exp + ' / usr_id ' + s.usr_id);
  $('#xif-scores').text(s.scores + '');
  $('#xif-persistent').text(s.persistent + '');
  $('#xif-rawnodes').text(s.rawNodes + '');
}

/* Pull the overview once on page load */
emit('xif_status').then(function (r) {
  xifRender(r.data);
}).catch(function (e) {
  $('#xif-loading').text('Failed to read: ' + e).addClass('is-danger');
});

/* Export the save document as JSON */
$('#xif-export').on('click', function () {
  emit('xif_export').then(function (r) {
    const json = JSON.stringify(r.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xif-save-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    xifToast('Save exported');
  });
});

/* Clear the persistent item table */
$('#xif-reset').on('click', function () {
  if (!confirm('Clear the persistent item table? Shop purchases will be gone on next login. This cannot be undone.')) return;
  emit('xif_reset_persistent').then(function (r) {
    const ok = r.data && r.data.ok;
    xifToast((r.data && r.data.message) || (ok ? 'Cleared' : 'Operation failed'), !ok);
    if (ok) {
      emit('xif_status').then(function (s) {
        xifRender(s.data);
      });
    }
  });
});
