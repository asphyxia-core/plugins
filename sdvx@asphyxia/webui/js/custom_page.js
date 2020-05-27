$('#plugin-click').on('click', () => {
  emit('click', {}).then(() => {
    location.reload();
  });
});
