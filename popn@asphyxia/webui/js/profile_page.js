$('#import-click').on('click', () => {
  data = {
    refid: $('#refid').val(),
    profile: $('#profile').val(),
    scores: $('#scores').val()
  }

  emit('importPnmData', data).then(() => {
    $('#import-success').removeClass("is-hidden");
  });
});
