(function($, window, document, undefined) {

  'use strict';

  /* =========================================================================== */
  /* WHITEBOARD
  /* =========================================================================== */

  var wb = {};

  /*
    Animation polyfills
  */

  wb.raf = (function() {
    return  (
      window.requestAnimationFrame       ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      window.msRequestAnimationFrame     ||
      window.oRequestAnimationFrame      ||
      function(callback) {
        return window.setTimeout(callback, 1000/60);
      }
    ).bind(window);
  })();

  wb.caf = (function() {
    return  (
      window.cancelAnimationFrame       ||
      window.webkitCancelAnimationFrame ||
      window.mozCancelAnimationFrame    ||
      window.msCancelAnimationFrame     ||
      window.oCancelAnimationFrame      ||
      function(callback) {
        window.clearTimeout(callback);
      }
    ).bind(window);
  })();

  /*
    Animation tick
   */

  wb.tick = function(fn) {
    return (function tick() {
      var id = wb.raf(tick);

      fn({
        scroll: $(window).scrollTop(),
        windowWidth: $(window).width(),
        windowHeight: $(window).height(),
        stop: function() { wb.caf(id); }
      });
    }());
  }

  /*
    Simple animation helper that animates a value from 0 to 1 over
    a period of time.

    Example:

    wb.animate({
      duration: 1500
    }, function() {
      console.log(this.value);
    });
  */

  wb.animate = function(options) {
    var animation = $.extend({
      time: 0,
      from: 0,
      to: 1,
      value: 0,
      delay: 0,
      duration: 1000,
      easing: 'linear',
      onChange: false,
      onFinish: false
    }, options);

    animation.time -= animation.delay;

    wb.tick(function(args) {
      if (animation.time >= animation.duration) {
        args.stop();
        animation.done = true;
      }

      if (animation.onChange) {
        animation.onChange.call(window, animation);
      }

      animation.time = Math.min(animation.duration, animation.time + 1000 / 60);

      if (animation.easing === 'linear' || animation.easing === 'swing') {
        animation.value = animation.from + (animation.to - animation.from) * animation.time / animation.duration;
      } else {
        animation.value = Number($.easing[animation.easing](null, Math.max(0, animation.time), animation.from, animation.to - animation.from, animation.duration));
      }

      if (animation.onFinish && animation.done) {
        animation.onFinish.call(window, animation);
      }
    });
  }

  /*
    Use this helper to invoke a callback function whenever an
    element enters the window viewport.

    Example:

    wb.stalker.watch('#page-title', {
      appear: function() { console.log('Page title appeared!'); },
      disappear: function() { console.log('Page title disappeared!'); }
    });
  */

  wb.stalker = (function() {
    var watchList = [];

    function isVisible($target) {
      var rect = $target.get(0).getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    }

    wb.tick(function(args) {
      watchList.forEach(function(obj) {
        var visible = isVisible(obj.target);

        if (visible !== obj.visible) {
          obj.target.trigger('wb.' + (visible ? 'appear' : 'disappear'));
          obj.visible = visible;
        }
      });
    });

    return {
      watch: function(target) {
        var $target = $(target);

        watchList.push({
          target: $target,
          visible: undefined
        });
      },

      unwatch: function(target) {
        for (var i = 0, n = watchList.length; i < n; i++) {
          if (watchList[i].target === target) {
            watchList.splice(i, 1);
            break;
          }
        }
      }
    };
  }());

  /*
    Use this helper to scroll the document smoothly to a target
    position.

    Parameters:

      - target [0]                        Scroll target, it can be an integer, a selector or a string that consists of an integer preceded by += or -=.
      - duration [800]                    Scroll duration in milli-seconds.
      - easing ['easeInOutCubic']         Scroll easing function.
      - offset [false]                    Number of pixels to offset from the target position, vertically.
      - changeHash [true]                 Change the URL hash (location.hash) when done scrolling.
      - onChange [false]                  Callback function to invoke on scroll.
      - onFinish [false]                  Callback function to invoke on scroll finish.

    Example: wb.scrollTo({parameters});
  */

  wb.scrollTo = function(scrollTo, options) {
    var options = $.extend({
          duration: 800,
          easing: 'easeInOutCubic',
          offset: false,
          changeHash: true,
          element: $('body'),
          onChange: false,
          onFinish: false
        }, options),
        scrollTo,
        sign;

    scrollTo = scrollTo || 0;

    /* incrementation/decrementation */
    if (/^(\+|\-)=/.test(scrollTo.toString())) {
      sign = scrollTo.slice(0, 1) === '-' ? -1 : 1;
      scrollTo = scrollTo.slice(2);
    }

    /* viewport height */
    if (/(vh)$/.test(scrollTo.toString())) {
      scrollTo = parseInt(scrollTo, 10) * $(window).height() / 100;
    } else

    /* percentage of scroll height */
    if (/(%)$/.test(scrollTo.toString())) {
      scrollTo = parseInt(scrollTo, 10) * ($(options.element).get(0).scrollHeight - window.innerHeight) / 100;
    } else

    /* element position */
    if (isNaN(scrollTo) && $(scrollTo).length) {
      scrollTo = $(scrollTo).offset().top;
    } else

    /* page top */
    if (!scrollTo || scrollTo === '#' || (isNaN(scrollTo) && $(scrollTo).length === 0)) {
      scrollTo = 0;
    }

    /* handle incrementation/decrementation */
    if (sign) {
      scrollTo = $(options.element).scrollTop() + sign * Number(scrollTo);
    }

    /* handle offset */
    scrollTo += options.offset || 0;

    wb.animate({
      duration: options.duration,
      easing: options.easing,
      from: $(options.element).scrollTop(),
      to: scrollTo,
      onChange: function(args) {
        $(options.element).scrollTop(args.value);

        if (options.onChange) {
          options.onChange.call(args);
        }
      },
      onFinish: function(args) {
        if (options.changeHash && scrollTo.toString().indexOf('#') === 0) {
          location.hash = scrollTo;
        }

        if (options.onFinish) {
          options.onFinish.call(args);
        }
      }
    });
  }

  /*
    Helper function to generate a parameters object from data
    attributes on an element. Camelcase parameter names should
    be hyphenated when provided as data attributes.
    For example, 'pauseOnHover' should be 'data-pause-on-hover'
    and not 'data-pauseOnHover'.
    This function will only return the keys that are passed in
    the defaults object, other data attributes will be ignored.

    Example:

    var params = wb.getAtts('#slider', {
      pauseOnHover: true
    });
  */

  wb.getAtts = function(target, defaults, prefix) {
    var options = {},
        option,
        optionHyphenated;

    prefix = prefix || 'wb-';

    for (option in defaults) {
      optionHyphenated = option.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      options[option] = typeof $(target).data(prefix + optionHyphenated) === 'undefined' ? defaults[option] : $(target).data(prefix + optionHyphenated);
    }

    return options;
  }

  /*
    Helper function to throttle a repeatable events.

    Example:

    var make = wb.throttle(function() {
      console.log('...');
    }, 100);

    make(); make(); make(); // ...
  */

 wb.throttle = function(callback, delay) {
    var timeOut;

    return function() {
      clearTimeout(timeOut);
      timeOut = setTimeout(function() {
        callback.call(this, Array.prototype.slice.call(arguments));
      }.bind(this), delay || 150);
    }.bind(this);
  }

  /*
    Throttle window resize events.
  */

  $(window).on('resize', wb.throttle(function() {
    $(window).trigger('wb.resize');
  }));

  window.whiteboard = window.wb = wb;

}(jQuery, window, document));

(function() {
  function init(e, data) {
    console.log('tabs', data.target);
  }

  $(window).on('wb.init.tabs', init)
}());

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJzY3JpcHRzLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigkLCB3aW5kb3csIGRvY3VtZW50LCB1bmRlZmluZWQpIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4gIC8qIFdISVRFQk9BUkRcbiAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgdmFyIHdiID0ge307XG5cbiAgLypcbiAgICBBbmltYXRpb24gcG9seWZpbGxzXG4gICovXG5cbiAgd2IucmFmID0gKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAgKFxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSAgICAgICB8fFxuICAgICAgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSAgICB8fFxuICAgICAgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lICAgICB8fFxuICAgICAgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgICAgICB8fFxuICAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5zZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDAwLzYwKTtcbiAgICAgIH1cbiAgICApLmJpbmQod2luZG93KTtcbiAgfSkoKTtcblxuICB3Yi5jYWYgPSAoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICAoXG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgICAgICAgfHxcbiAgICAgIHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICAgICAgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lICAgIHx8XG4gICAgICB3aW5kb3cubXNDYW5jZWxBbmltYXRpb25GcmFtZSAgICAgfHxcbiAgICAgIHdpbmRvdy5vQ2FuY2VsQW5pbWF0aW9uRnJhbWUgICAgICB8fFxuICAgICAgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dChjYWxsYmFjayk7XG4gICAgICB9XG4gICAgKS5iaW5kKHdpbmRvdyk7XG4gIH0pKCk7XG5cbiAgLypcbiAgICBBbmltYXRpb24gdGlja1xuICAgKi9cblxuICB3Yi50aWNrID0gZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gKGZ1bmN0aW9uIHRpY2soKSB7XG4gICAgICB2YXIgaWQgPSB3Yi5yYWYodGljayk7XG5cbiAgICAgIGZuKHtcbiAgICAgICAgc2Nyb2xsOiAkKHdpbmRvdykuc2Nyb2xsVG9wKCksXG4gICAgICAgIHdpbmRvd1dpZHRoOiAkKHdpbmRvdykud2lkdGgoKSxcbiAgICAgICAgd2luZG93SGVpZ2h0OiAkKHdpbmRvdykuaGVpZ2h0KCksXG4gICAgICAgIHN0b3A6IGZ1bmN0aW9uKCkgeyB3Yi5jYWYoaWQpOyB9XG4gICAgICB9KTtcbiAgICB9KCkpO1xuICB9XG5cbiAgLypcbiAgICBTaW1wbGUgYW5pbWF0aW9uIGhlbHBlciB0aGF0IGFuaW1hdGVzIGEgdmFsdWUgZnJvbSAwIHRvIDEgb3ZlclxuICAgIGEgcGVyaW9kIG9mIHRpbWUuXG5cbiAgICBFeGFtcGxlOlxuXG4gICAgd2IuYW5pbWF0ZSh7XG4gICAgICBkdXJhdGlvbjogMTUwMFxuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgY29uc29sZS5sb2codGhpcy52YWx1ZSk7XG4gICAgfSk7XG4gICovXG5cbiAgd2IuYW5pbWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB2YXIgYW5pbWF0aW9uID0gJC5leHRlbmQoe1xuICAgICAgdGltZTogMCxcbiAgICAgIGZyb206IDAsXG4gICAgICB0bzogMSxcbiAgICAgIHZhbHVlOiAwLFxuICAgICAgZGVsYXk6IDAsXG4gICAgICBkdXJhdGlvbjogMTAwMCxcbiAgICAgIGVhc2luZzogJ2xpbmVhcicsXG4gICAgICBvbkNoYW5nZTogZmFsc2UsXG4gICAgICBvbkZpbmlzaDogZmFsc2VcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIGFuaW1hdGlvbi50aW1lIC09IGFuaW1hdGlvbi5kZWxheTtcblxuICAgIHdiLnRpY2soZnVuY3Rpb24oYXJncykge1xuICAgICAgaWYgKGFuaW1hdGlvbi50aW1lID49IGFuaW1hdGlvbi5kdXJhdGlvbikge1xuICAgICAgICBhcmdzLnN0b3AoKTtcbiAgICAgICAgYW5pbWF0aW9uLmRvbmUgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoYW5pbWF0aW9uLm9uQ2hhbmdlKSB7XG4gICAgICAgIGFuaW1hdGlvbi5vbkNoYW5nZS5jYWxsKHdpbmRvdywgYW5pbWF0aW9uKTtcbiAgICAgIH1cblxuICAgICAgYW5pbWF0aW9uLnRpbWUgPSBNYXRoLm1pbihhbmltYXRpb24uZHVyYXRpb24sIGFuaW1hdGlvbi50aW1lICsgMTAwMCAvIDYwKTtcblxuICAgICAgaWYgKGFuaW1hdGlvbi5lYXNpbmcgPT09ICdsaW5lYXInIHx8IGFuaW1hdGlvbi5lYXNpbmcgPT09ICdzd2luZycpIHtcbiAgICAgICAgYW5pbWF0aW9uLnZhbHVlID0gYW5pbWF0aW9uLmZyb20gKyAoYW5pbWF0aW9uLnRvIC0gYW5pbWF0aW9uLmZyb20pICogYW5pbWF0aW9uLnRpbWUgLyBhbmltYXRpb24uZHVyYXRpb247XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhbmltYXRpb24udmFsdWUgPSBOdW1iZXIoJC5lYXNpbmdbYW5pbWF0aW9uLmVhc2luZ10obnVsbCwgTWF0aC5tYXgoMCwgYW5pbWF0aW9uLnRpbWUpLCBhbmltYXRpb24uZnJvbSwgYW5pbWF0aW9uLnRvIC0gYW5pbWF0aW9uLmZyb20sIGFuaW1hdGlvbi5kdXJhdGlvbikpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYW5pbWF0aW9uLm9uRmluaXNoICYmIGFuaW1hdGlvbi5kb25lKSB7XG4gICAgICAgIGFuaW1hdGlvbi5vbkZpbmlzaC5jYWxsKHdpbmRvdywgYW5pbWF0aW9uKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qXG4gICAgVXNlIHRoaXMgaGVscGVyIHRvIGludm9rZSBhIGNhbGxiYWNrIGZ1bmN0aW9uIHdoZW5ldmVyIGFuXG4gICAgZWxlbWVudCBlbnRlcnMgdGhlIHdpbmRvdyB2aWV3cG9ydC5cblxuICAgIEV4YW1wbGU6XG5cbiAgICB3Yi5zdGFsa2VyLndhdGNoKCcjcGFnZS10aXRsZScsIHtcbiAgICAgIGFwcGVhcjogZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKCdQYWdlIHRpdGxlIGFwcGVhcmVkIScpOyB9LFxuICAgICAgZGlzYXBwZWFyOiBmdW5jdGlvbigpIHsgY29uc29sZS5sb2coJ1BhZ2UgdGl0bGUgZGlzYXBwZWFyZWQhJyk7IH1cbiAgICB9KTtcbiAgKi9cblxuICB3Yi5zdGFsa2VyID0gKGZ1bmN0aW9uKCkge1xuICAgIHZhciB3YXRjaExpc3QgPSBbXTtcblxuICAgIGZ1bmN0aW9uIGlzVmlzaWJsZSgkdGFyZ2V0KSB7XG4gICAgICB2YXIgcmVjdCA9ICR0YXJnZXQuZ2V0KDApLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgcmV0dXJuIHJlY3QuYm90dG9tID4gMCAmJiByZWN0LnRvcCA8IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICB9XG5cbiAgICB3Yi50aWNrKGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgIHdhdGNoTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKG9iaikge1xuICAgICAgICB2YXIgdmlzaWJsZSA9IGlzVmlzaWJsZShvYmoudGFyZ2V0KTtcblxuICAgICAgICBpZiAodmlzaWJsZSAhPT0gb2JqLnZpc2libGUpIHtcbiAgICAgICAgICBvYmoudGFyZ2V0LnRyaWdnZXIoJ3diLicgKyAodmlzaWJsZSA/ICdhcHBlYXInIDogJ2Rpc2FwcGVhcicpKTtcbiAgICAgICAgICBvYmoudmlzaWJsZSA9IHZpc2libGU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHdhdGNoOiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkKHRhcmdldCk7XG5cbiAgICAgICAgd2F0Y2hMaXN0LnB1c2goe1xuICAgICAgICAgIHRhcmdldDogJHRhcmdldCxcbiAgICAgICAgICB2aXNpYmxlOiB1bmRlZmluZWRcbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICB1bndhdGNoOiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIG4gPSB3YXRjaExpc3QubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgaWYgKHdhdGNoTGlzdFtpXS50YXJnZXQgPT09IHRhcmdldCkge1xuICAgICAgICAgICAgd2F0Y2hMaXN0LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0oKSk7XG5cbiAgLypcbiAgICBVc2UgdGhpcyBoZWxwZXIgdG8gc2Nyb2xsIHRoZSBkb2N1bWVudCBzbW9vdGhseSB0byBhIHRhcmdldFxuICAgIHBvc2l0aW9uLlxuXG4gICAgUGFyYW1ldGVyczpcblxuICAgICAgLSB0YXJnZXQgWzBdICAgICAgICAgICAgICAgICAgICAgICAgU2Nyb2xsIHRhcmdldCwgaXQgY2FuIGJlIGFuIGludGVnZXIsIGEgc2VsZWN0b3Igb3IgYSBzdHJpbmcgdGhhdCBjb25zaXN0cyBvZiBhbiBpbnRlZ2VyIHByZWNlZGVkIGJ5ICs9IG9yIC09LlxuICAgICAgLSBkdXJhdGlvbiBbODAwXSAgICAgICAgICAgICAgICAgICAgU2Nyb2xsIGR1cmF0aW9uIGluIG1pbGxpLXNlY29uZHMuXG4gICAgICAtIGVhc2luZyBbJ2Vhc2VJbk91dEN1YmljJ10gICAgICAgICBTY3JvbGwgZWFzaW5nIGZ1bmN0aW9uLlxuICAgICAgLSBvZmZzZXQgW2ZhbHNlXSAgICAgICAgICAgICAgICAgICAgTnVtYmVyIG9mIHBpeGVscyB0byBvZmZzZXQgZnJvbSB0aGUgdGFyZ2V0IHBvc2l0aW9uLCB2ZXJ0aWNhbGx5LlxuICAgICAgLSBjaGFuZ2VIYXNoIFt0cnVlXSAgICAgICAgICAgICAgICAgQ2hhbmdlIHRoZSBVUkwgaGFzaCAobG9jYXRpb24uaGFzaCkgd2hlbiBkb25lIHNjcm9sbGluZy5cbiAgICAgIC0gb25DaGFuZ2UgW2ZhbHNlXSAgICAgICAgICAgICAgICAgIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGludm9rZSBvbiBzY3JvbGwuXG4gICAgICAtIG9uRmluaXNoIFtmYWxzZV0gICAgICAgICAgICAgICAgICBDYWxsYmFjayBmdW5jdGlvbiB0byBpbnZva2Ugb24gc2Nyb2xsIGZpbmlzaC5cblxuICAgIEV4YW1wbGU6IHdiLnNjcm9sbFRvKHtwYXJhbWV0ZXJzfSk7XG4gICovXG5cbiAgd2Iuc2Nyb2xsVG8gPSBmdW5jdGlvbihzY3JvbGxUbywgb3B0aW9ucykge1xuICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQoe1xuICAgICAgICAgIGR1cmF0aW9uOiA4MDAsXG4gICAgICAgICAgZWFzaW5nOiAnZWFzZUluT3V0Q3ViaWMnLFxuICAgICAgICAgIG9mZnNldDogZmFsc2UsXG4gICAgICAgICAgY2hhbmdlSGFzaDogdHJ1ZSxcbiAgICAgICAgICBlbGVtZW50OiAkKCdib2R5JyksXG4gICAgICAgICAgb25DaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgIG9uRmluaXNoOiBmYWxzZVxuICAgICAgICB9LCBvcHRpb25zKSxcbiAgICAgICAgc2Nyb2xsVG8sXG4gICAgICAgIHNpZ247XG5cbiAgICBzY3JvbGxUbyA9IHNjcm9sbFRvIHx8IDA7XG5cbiAgICAvKiBpbmNyZW1lbnRhdGlvbi9kZWNyZW1lbnRhdGlvbiAqL1xuICAgIGlmICgvXihcXCt8XFwtKT0vLnRlc3Qoc2Nyb2xsVG8udG9TdHJpbmcoKSkpIHtcbiAgICAgIHNpZ24gPSBzY3JvbGxUby5zbGljZSgwLCAxKSA9PT0gJy0nID8gLTEgOiAxO1xuICAgICAgc2Nyb2xsVG8gPSBzY3JvbGxUby5zbGljZSgyKTtcbiAgICB9XG5cbiAgICAvKiB2aWV3cG9ydCBoZWlnaHQgKi9cbiAgICBpZiAoLyh2aCkkLy50ZXN0KHNjcm9sbFRvLnRvU3RyaW5nKCkpKSB7XG4gICAgICBzY3JvbGxUbyA9IHBhcnNlSW50KHNjcm9sbFRvLCAxMCkgKiAkKHdpbmRvdykuaGVpZ2h0KCkgLyAxMDA7XG4gICAgfSBlbHNlXG5cbiAgICAvKiBwZXJjZW50YWdlIG9mIHNjcm9sbCBoZWlnaHQgKi9cbiAgICBpZiAoLyglKSQvLnRlc3Qoc2Nyb2xsVG8udG9TdHJpbmcoKSkpIHtcbiAgICAgIHNjcm9sbFRvID0gcGFyc2VJbnQoc2Nyb2xsVG8sIDEwKSAqICgkKG9wdGlvbnMuZWxlbWVudCkuZ2V0KDApLnNjcm9sbEhlaWdodCAtIHdpbmRvdy5pbm5lckhlaWdodCkgLyAxMDA7XG4gICAgfSBlbHNlXG5cbiAgICAvKiBlbGVtZW50IHBvc2l0aW9uICovXG4gICAgaWYgKGlzTmFOKHNjcm9sbFRvKSAmJiAkKHNjcm9sbFRvKS5sZW5ndGgpIHtcbiAgICAgIHNjcm9sbFRvID0gJChzY3JvbGxUbykub2Zmc2V0KCkudG9wO1xuICAgIH0gZWxzZVxuXG4gICAgLyogcGFnZSB0b3AgKi9cbiAgICBpZiAoIXNjcm9sbFRvIHx8IHNjcm9sbFRvID09PSAnIycgfHwgKGlzTmFOKHNjcm9sbFRvKSAmJiAkKHNjcm9sbFRvKS5sZW5ndGggPT09IDApKSB7XG4gICAgICBzY3JvbGxUbyA9IDA7XG4gICAgfVxuXG4gICAgLyogaGFuZGxlIGluY3JlbWVudGF0aW9uL2RlY3JlbWVudGF0aW9uICovXG4gICAgaWYgKHNpZ24pIHtcbiAgICAgIHNjcm9sbFRvID0gJChvcHRpb25zLmVsZW1lbnQpLnNjcm9sbFRvcCgpICsgc2lnbiAqIE51bWJlcihzY3JvbGxUbyk7XG4gICAgfVxuXG4gICAgLyogaGFuZGxlIG9mZnNldCAqL1xuICAgIHNjcm9sbFRvICs9IG9wdGlvbnMub2Zmc2V0IHx8IDA7XG5cbiAgICB3Yi5hbmltYXRlKHtcbiAgICAgIGR1cmF0aW9uOiBvcHRpb25zLmR1cmF0aW9uLFxuICAgICAgZWFzaW5nOiBvcHRpb25zLmVhc2luZyxcbiAgICAgIGZyb206ICQob3B0aW9ucy5lbGVtZW50KS5zY3JvbGxUb3AoKSxcbiAgICAgIHRvOiBzY3JvbGxUbyxcbiAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgICQob3B0aW9ucy5lbGVtZW50KS5zY3JvbGxUb3AoYXJncy52YWx1ZSk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMub25DaGFuZ2UpIHtcbiAgICAgICAgICBvcHRpb25zLm9uQ2hhbmdlLmNhbGwoYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBvbkZpbmlzaDogZnVuY3Rpb24oYXJncykge1xuICAgICAgICBpZiAob3B0aW9ucy5jaGFuZ2VIYXNoICYmIHNjcm9sbFRvLnRvU3RyaW5nKCkuaW5kZXhPZignIycpID09PSAwKSB7XG4gICAgICAgICAgbG9jYXRpb24uaGFzaCA9IHNjcm9sbFRvO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMub25GaW5pc2gpIHtcbiAgICAgICAgICBvcHRpb25zLm9uRmluaXNoLmNhbGwoYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qXG4gICAgSGVscGVyIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGEgcGFyYW1ldGVycyBvYmplY3QgZnJvbSBkYXRhXG4gICAgYXR0cmlidXRlcyBvbiBhbiBlbGVtZW50LiBDYW1lbGNhc2UgcGFyYW1ldGVyIG5hbWVzIHNob3VsZFxuICAgIGJlIGh5cGhlbmF0ZWQgd2hlbiBwcm92aWRlZCBhcyBkYXRhIGF0dHJpYnV0ZXMuXG4gICAgRm9yIGV4YW1wbGUsICdwYXVzZU9uSG92ZXInIHNob3VsZCBiZSAnZGF0YS1wYXVzZS1vbi1ob3ZlcidcbiAgICBhbmQgbm90ICdkYXRhLXBhdXNlT25Ib3ZlcicuXG4gICAgVGhpcyBmdW5jdGlvbiB3aWxsIG9ubHkgcmV0dXJuIHRoZSBrZXlzIHRoYXQgYXJlIHBhc3NlZCBpblxuICAgIHRoZSBkZWZhdWx0cyBvYmplY3QsIG90aGVyIGRhdGEgYXR0cmlidXRlcyB3aWxsIGJlIGlnbm9yZWQuXG5cbiAgICBFeGFtcGxlOlxuXG4gICAgdmFyIHBhcmFtcyA9IHdiLmdldEF0dHMoJyNzbGlkZXInLCB7XG4gICAgICBwYXVzZU9uSG92ZXI6IHRydWVcbiAgICB9KTtcbiAgKi9cblxuICB3Yi5nZXRBdHRzID0gZnVuY3Rpb24odGFyZ2V0LCBkZWZhdWx0cywgcHJlZml4KSB7XG4gICAgdmFyIG9wdGlvbnMgPSB7fSxcbiAgICAgICAgb3B0aW9uLFxuICAgICAgICBvcHRpb25IeXBoZW5hdGVkO1xuXG4gICAgcHJlZml4ID0gcHJlZml4IHx8ICd3Yi0nO1xuXG4gICAgZm9yIChvcHRpb24gaW4gZGVmYXVsdHMpIHtcbiAgICAgIG9wdGlvbkh5cGhlbmF0ZWQgPSBvcHRpb24ucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgJyQxLSQyJykudG9Mb3dlckNhc2UoKTtcbiAgICAgIG9wdGlvbnNbb3B0aW9uXSA9IHR5cGVvZiAkKHRhcmdldCkuZGF0YShwcmVmaXggKyBvcHRpb25IeXBoZW5hdGVkKSA9PT0gJ3VuZGVmaW5lZCcgPyBkZWZhdWx0c1tvcHRpb25dIDogJCh0YXJnZXQpLmRhdGEocHJlZml4ICsgb3B0aW9uSHlwaGVuYXRlZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdGlvbnM7XG4gIH1cblxuICAvKlxuICAgIEhlbHBlciBmdW5jdGlvbiB0byB0aHJvdHRsZSBhIHJlcGVhdGFibGUgZXZlbnRzLlxuXG4gICAgRXhhbXBsZTpcblxuICAgIHZhciBtYWtlID0gd2IudGhyb3R0bGUoZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZygnLi4uJyk7XG4gICAgfSwgMTAwKTtcblxuICAgIG1ha2UoKTsgbWFrZSgpOyBtYWtlKCk7IC8vIC4uLlxuICAqL1xuXG4gd2IudGhyb3R0bGUgPSBmdW5jdGlvbihjYWxsYmFjaywgZGVsYXkpIHtcbiAgICB2YXIgdGltZU91dDtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lT3V0KTtcbiAgICAgIHRpbWVPdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgICAgfS5iaW5kKHRoaXMpLCBkZWxheSB8fCAxNTApO1xuICAgIH0uYmluZCh0aGlzKTtcbiAgfVxuXG4gIC8qXG4gICAgVGhyb3R0bGUgd2luZG93IHJlc2l6ZSBldmVudHMuXG4gICovXG5cbiAgJCh3aW5kb3cpLm9uKCdyZXNpemUnLCB3Yi50aHJvdHRsZShmdW5jdGlvbigpIHtcbiAgICAkKHdpbmRvdykudHJpZ2dlcignd2IucmVzaXplJyk7XG4gIH0pKTtcblxuICB3aW5kb3cud2hpdGVib2FyZCA9IHdpbmRvdy53YiA9IHdiO1xuXG59KGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCkpO1xuXG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIGluaXQoZSwgZGF0YSkge1xuICAgIGNvbnNvbGUubG9nKCd0YWJzJywgZGF0YS50YXJnZXQpO1xuICB9XG5cbiAgJCh3aW5kb3cpLm9uKCd3Yi5pbml0LnRhYnMnLCBpbml0KVxufSgpKTtcbiJdLCJmaWxlIjoic2NyaXB0cy5qcyJ9
