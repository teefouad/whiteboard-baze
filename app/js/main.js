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
