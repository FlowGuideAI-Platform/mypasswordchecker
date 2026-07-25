/**
 * House ad rail — two slots, three creatives, offset rotation.
 *
 * THE RULE
 * On each tick exactly ONE slot flips, and it takes the creative that
 * NEITHER slot is currently showing. Because the indices are 0, 1 and 2,
 * the missing one is always `3 - a - b`.
 *
 * That single expression guarantees three things at once:
 *   1. the two slots never show the same creative,
 *   2. they never change at the same moment (only one flips per tick),
 *   3. the pair walks all six ordered combinations before repeating:
 *      (0,1) → (0,2) → (1,2) → (1,0) → (2,0) → (2,1) → (0,1)
 *
 * With INTERVAL = 8000 something on the rail changes every 8s, while any
 * individual creative holds its slot for 16s — long enough to be read.
 *
 * Transition is a HARD CUT on purpose. Nothing else on the page animates;
 * a fade here would be the only moving thing on screen and would pull the
 * eye off the crack-time numerals, which are the point of the page.
 *
 * MARKUP EXPECTED
 *   <div class="ad-slot" data-slot="a">
 *     <div class="ad-creative" data-ad="0">…forgemcp…</div>
 *     <div class="ad-creative" data-ad="1">…flowguideai…</div>
 *     <div class="ad-creative" data-ad="2">…suggestibility…</div>
 *   </div>
 *   <div class="ad-slot" data-slot="b"> …the same three… </div>
 *
 *   .ad-slot     { position: relative; width: 300px; height: 250px; }
 *   .ad-creative { position: absolute; inset: 0; display: none; }
 *
 * Creatives may be inlined markup or <iframe> elements pointing at the
 * files in ./creatives/. If you use iframes, set them to 300×250 with
 * scrolling="no" and loading="lazy", and note that a hidden iframe still
 * loads — acceptable here since all three are first-party and tiny.
 */

(function () {
  'use strict';

  var INTERVAL = 8000;
  var COUNT = 3;

  function initAdRail(root) {
    root = root || document;

    var slotA = root.querySelector('.ad-slot[data-slot="a"]');
    var slotB = root.querySelector('.ad-slot[data-slot="b"]');
    if (!slotA || !slotB) return null;

    var a = 0;
    var b = 1;
    var turn = 'b';
    var timer = null;

    function paint(slot, index) {
      var kids = slot.querySelectorAll('.ad-creative');
      for (var i = 0; i < kids.length; i++) {
        kids[i].style.display = (i === index) ? 'block' : 'none';
      }
    }

    function render() {
      paint(slotA, a);
      paint(slotB, b);
    }

    function tick() {
      var missing = (COUNT * (COUNT - 1) / 2) - a - b; // 3 - a - b for COUNT === 3
      if (turn === 'b') { b = missing; turn = 'a'; }
      else { a = missing; turn = 'b'; }
      render();
    }

    function start() {
      if (timer) return;
      timer = setInterval(tick, INTERVAL);
    }

    function stop() {
      clearInterval(timer);
      timer = null;
    }

    // Don't burn rotations against a hidden tab, and respect reduced motion
    // by holding the initial pair rather than cycling.
    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('visibilitychange', function () {
      if (document.hidden || reduced) stop(); else start();
    });

    render();
    if (!reduced) start();

    return { start: start, stop: stop, tick: tick };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { initAdRail: initAdRail };
  else window.initAdRail = initAdRail;
})();
