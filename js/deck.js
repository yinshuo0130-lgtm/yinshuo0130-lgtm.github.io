/* 叠放卡牌：影视片架和 BGM 播放列表共用
   - 所有卡牌的位置都由一个连续的浮点数 pos 推出来，按钮、键盘、拖动、滚轮只改目标值 target，
     每帧用指数缓动把 pos 拉向 target，所以切换中途再点、拖动中松手都是连贯的，不会跳帧。
   - 前面一张居中放大，两侧的卡牌越往后越小、越暗、略微倾斜，叠成一摞；首尾相接，可以一直翻。
   - 只改 transform / opacity，不触发重排。
   结构：.deck > .deck-stage > .dcard（data-title / data-sub / data-meta / data-tags）
         .deck 后面可选 .filters[data-for=deck的id]，按 data-tags 自动生成筛选按钮。 */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sfx = function(n){ window.ysSfx && window.ysSfx(n); };

  function Deck(root){
    var stage = root.querySelector('.deck-stage');
    var all = [].slice.call(stage.querySelectorAll('.dcard'));
    var ui = root.querySelector('.deck-ui');
    var tEl = ui.querySelector('.t'), sEl = ui.querySelector('.s'), mEl = ui.querySelector('.m'), nEl = ui.querySelector('.n');
    var thumb = root.querySelector('.deck-scrub i');
    var listEl = root.querySelector('.deck-list');
    var cards = all.slice(), pos = 0, target = 0, front = -1, raf = 0, last = 0;
    var drag = null;

    function mod(a, n){ return ((a % n) + n) % n; }
    var film = root.classList.contains('film') ? Film(root, stage, all) : null;
    function step(){ return film ? film.step() : Math.min(220, stage.clientWidth * 0.2); }

    function place(){
      var n = cards.length; if (!n) return;
      if (film){
        film.place(cards, pos);
        var ff = mod(Math.round(pos), n);
        if (ff !== front){ setFront(ff); }
        if (thumb) thumb.style.left = (n > 1 ? mod(pos, n) / (n - 1) : 0) * 100 + '%';
        return;
      }
      var S = step(), half = n / 2;
      for (var i = 0; i < n; i++){
        var d = mod(i - pos + half, n) - half;          // 相对前牌的偏移，-n/2 ~ n/2
        var a = Math.abs(d), sg = d < 0 ? -1 : 1;
        var el = cards[i];
        if (a > 4.6){ el.style.visibility = 'hidden'; continue; }
        el.style.visibility = '';
        // 离得越远，横向间距越小，叠在一起
        var x = sg * S * (1.25 * (1 - Math.exp(-a * 0.85)) + 0.12 * a);
        var sc = 1 - Math.min(a, 4) * 0.085;
        var r = sg * Math.min(a, 3) * 3.2;
        var y = Math.min(a, 4) * 6;
        el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) rotate(' + r.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
        el.style.zIndex = 100 - Math.round(a * 10);
        el.style.setProperty('--dim', Math.min(a, 3.5) * 0.17);
        el.style.opacity = a > 3.8 ? Math.max(0, 4.6 - a) / 0.8 : 1;
      }
      var f = mod(Math.round(pos), n);
      if (f !== front){ setFront(f); }
      if (thumb) thumb.style.left = (n > 1 ? mod(pos, n) / (n - 1) : 0) * 100 + '%';
    }
    function setFront(f){
      if (front >= 0 && cards[front]) cards[front].classList.remove('front');
      front = f; var c = cards[f]; c.classList.add('front');
      if (film) film.show(c);
      tEl.textContent = c.dataset.title || '';
      sEl.textContent = c.dataset.sub || '';
      mEl.textContent = c.dataset.meta || '';
      nEl.textContent = String(f + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
      ui.classList.remove('swap'); void ui.offsetWidth; ui.classList.add('swap');
      // 系列作品：前牌带 data-list 时，在下方列出单部作品
      if (listEl){
        var src = c.dataset.list;
        listEl.hidden = !src;
        if (src) listEl.innerHTML = src.split(';').map(function(g){
          var p = g.split('|');
          return '<div class="grp"><b>' + p[0] + '</b><ul>' + p[1].split(',').map(function(x){
            // 每一项写成“名称=图片文件名”，有图就做成封面小卡，没图就只显示名称
            var kv = x.split('='), name = kv[0], img = kv[1];
            var y = name.match(/\s(\d{4})$/); if (y) name = name.slice(0, -5);
            return '<li' + (img ? ' class="pic"' : '') + '>' + (img ? '<img src="' + img + '" alt="" loading="lazy" draggable="false">' : '') + '<span>' + name + (y ? '<i>' + y[1] + '</i>' : '') + '</span></li>';
          }).join('') + '</ul></div>';
        }).join('');
      }
    }
    function tick(t){
      var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      if (!drag){
        var k = reduce ? 1 : 1 - Math.exp(-dt * 11);
        pos += (target - pos) * k;
        if (Math.abs(target - pos) < 0.0008) pos = target;
      }
      place();
      if (drag || pos !== target) raf = requestAnimationFrame(tick); else raf = 0;
    }
    function kick(){ if (!raf){ last = performance.now(); raf = requestAnimationFrame(tick); } }
    function go(delta){ if (!cards.length) return; target = Math.round(target) + delta; sfx('select'); kick(); }
    function goTo(i){ // 走最近的方向
      var n = cards.length, cur = mod(Math.round(target), n), d = i - cur;
      if (d > n / 2) d -= n; if (d < -n / 2) d += n;
      if (d) go(d);
    }

    ui.querySelector('.prev').addEventListener('click', function(){ go(-1); });
    ui.querySelector('.next').addEventListener('click', function(){ go(1); });
    root.addEventListener('keydown', function(e){
      if (e.key === 'ArrowLeft' || (film && e.key === 'ArrowUp')){ e.preventDefault(); go(-1); }
      else if (e.key === 'ArrowRight' || (film && e.key === 'ArrowDown')){ e.preventDefault(); go(1); }
    });

    // 拖动 / 轻扫：跟手移动，松手按速度甩出去
    stage.addEventListener('pointerdown', function(e){
      if (e.button !== 0) return;
      var ax = film && film.vertical() ? 'clientY' : 'clientX';
      drag = {ax: ax, x: e[ax], p: pos, v: 0, lx: e[ax], lt: performance.now(), moved: false, id: e.pointerId};
      kick();
    });
    addEventListener('pointermove', function(e){
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e[drag.ax] - drag.x;
      if (!drag.moved && Math.abs(dx) > 6){ drag.moved = true; stage.setPointerCapture && stage.setPointerCapture(e.pointerId); root.classList.add('dragging'); }
      if (!drag.moved) return;
      var now = performance.now(), S = step();
      drag.v = 0.8 * drag.v + 0.2 * ((e[drag.ax] - drag.lx) / Math.max(1, now - drag.lt));
      drag.lx = e[drag.ax]; drag.lt = now;
      pos = drag.p - dx / S;
    });
    function up(e){
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null; root.classList.remove('dragging');
      if (d.moved){
        var fling = -d.v * 1000 / step() * 0.12;              // 速度换算成多翻几张
        target = Math.round(pos + Math.max(-3, Math.min(3, fling)));
        if (target !== Math.round(d.p)) sfx('select');
        stage._noClick = true; setTimeout(function(){ stage._noClick = false; }, 0);
      }
      kick();
    }
    addEventListener('pointerup', up); addEventListener('pointercancel', up);

    // 点两侧的卡牌：翻到那一张
    all.forEach(function(c){
      c.addEventListener('click', function(){
        if (stage._noClick) return;
        var i = cards.indexOf(c); if (i < 0 || i === front) return;
        goTo(i);
      });
    });

    // 触控板横向滑动
    var acc = 0, accT = 0;
    stage.addEventListener('wheel', function(e){
      var dv = film && film.vertical() && e.target.closest && e.target.closest('.film-rail') ? e.deltaY : 0;
      if (!dv && Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      var now = performance.now(); if (now - accT > 200) acc = 0; accT = now;
      acc += dv || e.deltaX;
      if (Math.abs(acc) > 60){ go(acc > 0 ? 1 : -1); acc = 0; }
    }, {passive: false});

    // 刻度条：点哪里跳到哪里
    var scrub = root.querySelector('.deck-scrub');
    if (scrub) scrub.addEventListener('click', function(e){
      var r = scrub.getBoundingClientRect(), k = (e.clientX - r.left) / r.width;
      goTo(Math.round(k * (cards.length - 1)));
    });

    // 筛选
    var fil = document.querySelector('.filters[data-for="' + root.id + '"]');
    if (fil){
      var tally = {};
      all.forEach(function(c){ (c.dataset.tags || '').split(' ').forEach(function(t){ if (t) tally[t] = (tally[t] || 0) + 1; }); });
      ['全部'].concat(Object.keys(tally).sort(function(a, b){ return tally[b] - tally[a]; })).forEach(function(t, i){
        var b = document.createElement('button');
        b.className = 'chip'; b.type = 'button'; b.setAttribute('aria-pressed', i ? 'false' : 'true');
        b.innerHTML = t + '<b>' + (i ? tally[t] : all.length) + '</b>';
        b.addEventListener('click', function(){
          fil.querySelectorAll('.chip').forEach(function(x){ x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          cards = all.filter(function(c){ var ok = t === '全部' || (c.dataset.tags || '').split(' ').indexOf(t) >= 0; c.hidden = !ok; return ok; });
          all.forEach(function(c){ c.classList.remove('front'); });
          front = -1;
          // 新的一摞从侧面滑进来
          pos = reduce ? 0 : -2.5; target = 0; sfx('select'); kick();
        });
        fil.appendChild(b);
      });
    }

    addEventListener('resize', function(){ if (film) film.resize(); place(); });
    root._film = film; root._place = place;
    place();
  }

  /* 胶片模式（.deck.film）：放映机式布局。
     - 右侧是一条连续的胶片（窄屏改为底部横向），整条片基和齿孔是同一个元素的背景，随 pos 一起滚动，
       画格只是嵌在片基上的窗口，所以不会断开；作品不够铺满时，空着的格位露出黑色片基（片头）。
     - 胶片中间有一个固定的“片门”，停在片门里的那一格就是当前作品：左侧银幕放出它的海报，
       整个背景换成它的模糊大图，两层图片交叉淡入。
     - 拖动方向跟着胶片走：竖排时上下拖，横排时左右拖。 */
  function Film(root, stage, all){
    function mod(a, n){ return ((a % n) + n) % n; }
    function el(cls, html){ var e = document.createElement('div'); e.className = cls; if (html) e.innerHTML = html; return e; }
    var bg = el('film-bg', '<img alt=""><img alt="">');
    root.insertBefore(bg, root.firstChild);
    var screen = el('film-screen', '<img alt=""><img alt="">');
    var beam = el('film-beam');
    var rail = el('film-rail'), reel = el('film-reel');
    rail.appendChild(reel);
    all.forEach(function(c){ reel.appendChild(c); });
    stage.appendChild(beam); stage.appendChild(screen); stage.appendChild(rail);
    var blanks = [], pitch = 112, len = 600, vert = true, lim = 4, layer = 0, shown = null;
    var sImgs = screen.querySelectorAll('img'), bImgs = bg.querySelectorAll('img');

    function build(){
      vert = !matchMedia('(max-width:640px)').matches;
      pitch = parseFloat(getComputedStyle(rail).getPropertyValue('--pitch')) || 112;
      len = vert ? rail.offsetHeight : rail.offsetWidth;
      lim = Math.ceil(len / 2 / pitch) + 1;
      while (blanks.length < lim * 2 + 2){
        var b = el('film-blank'); b.setAttribute('aria-hidden', 'true');
        reel.appendChild(b); blanks.push(b);
      }
    }
    function put(e, d){
      var o = d * pitch;
      if (Math.abs(o) > len / 2 + pitch){ e.style.visibility = 'hidden'; return false; }
      e.style.visibility = '';
      e.style.transform = vert ? 'translate3d(0,' + o.toFixed(1) + 'px,0)' : 'translate3d(' + o.toFixed(1) + 'px,0,0)';
      return true;
    }
    build();
    return {
      vertical: function(){ return vert; },
      step: function(){ return pitch; },
      resize: build,
      show: function(c){
        var img = c.querySelector('img'); if (!img || img === shown) return;
        shown = img; layer ^= 1;
        [sImgs, bImgs].forEach(function(set){
          set[layer].src = img.currentSrc || img.src;
          set[layer].classList.add('on'); set[layer ^ 1].classList.remove('on');
        });
        screen.setAttribute('data-alt', img.alt);
      },
      place: function(cards, pos){
        var n = cards.length, half = n / 2;
        // 齿孔和片基跟着走：每格四个齿孔
        rail.style.setProperty('--off', (-mod(pos, 1) * pitch).toFixed(1) + 'px');
        for (var i = 0; i < n; i++){
          var d = mod(i - pos + half, n) - half, c = cards[i];
          if (put(c, d)) c.style.setProperty('--dim', Math.min(Math.abs(d), 3) * 0.2);
        }
        var base = Math.round(pos), j = 0;
        for (var k = -lim; k <= lim; k++){
          var t = base + k - pos;
          if (t >= -half && t < half) continue;        // 这一格上有作品
          if (j < blanks.length) put(blanks[j++], t);
        }
        for (; j < blanks.length; j++) blanks[j].style.visibility = 'hidden';
      }
    };
  }

  document.querySelectorAll('.deck').forEach(function(d){ Deck(d); });
})();
