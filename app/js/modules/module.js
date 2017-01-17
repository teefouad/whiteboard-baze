(function() {
  function init(e, data) {
    console.log('tabs', data.target);
  }

  $(window).on('wb.init.tabs', init)
}());
