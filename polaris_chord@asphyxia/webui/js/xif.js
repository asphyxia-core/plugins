/* xif@asphyxia 控制台页面的前端逻辑 */

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
    $('#xif-loading').text((s && s.message) || '没有读取到玩家数据').addClass('is-danger');
    return;
  }
  $('#xif-loading').hide();
  $('#xif-panel').show();
  $('#xif-name').text(s.name || '(未命名)');
  $('#xif-meta').text('rank ' + s.rank + ' / exp ' + s.exp + ' / usr_id ' + s.usr_id);
  $('#xif-scores').text(s.scores + ' 首');
  $('#xif-persistent').text(s.persistent + ' 条');
  $('#xif-rawnodes').text(s.rawNodes + ' 个');
}

/* 页面加载时拉一次概况 */
emit('xif_status').then(function (r) {
  xifRender(r.data);
}).catch(function (e) {
  $('#xif-loading').text('读取失败: ' + e).addClass('is-danger');
});

/* 导出存档 JSON */
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
    xifToast('存档已导出');
  });
});

/* 清空持久道具表 */
$('#xif-reset').on('click', function () {
  if (!confirm('确定清空持久道具表？下次登录时商店购买记录会消失，此操作不可撤销。')) return;
  emit('xif_reset_persistent').then(function (r) {
    const ok = r.data && r.data.ok;
    xifToast((r.data && r.data.message) || (ok ? '已清空' : '操作失败'), !ok);
    if (ok) {
      emit('xif_status').then(function (s) {
        xifRender(s.data);
      });
    }
  });
});
