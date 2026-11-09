/* 关于我页：角色介绍页的分页、属性滚动、技能说明，以及游戏库的游戏机 */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sfx = function(n){ window.ysSfx && window.ysSfx(n); };

  /* ---------- 角色介绍页 ---------- */
  var tabs = [].slice.call(document.querySelectorAll('.ctabs [role="tab"]'));
  var counted = false;
  function countUp(){
    if (counted) return; counted = true;
    document.querySelectorAll('.cstats b[data-n]').forEach(function(b){
      var n = +b.dataset.n, suf = b.dataset.suf || '';
      if (reduce){ b.textContent = n + suf; return; }
      var t0 = performance.now();
      (function f(t){
        var k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3);
        b.textContent = Math.round(n * e) + suf;
        if (k < 1) requestAnimationFrame(f);
      })(t0);
    });
  }
  function show(tab, quiet){
    tabs.forEach(function(t){
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).classList.toggle('on', on);
    });
    if (!quiet) sfx('select');
    if (tab.id === 't-stat') countUp();
  }
  tabs.forEach(function(t, i){
    t.addEventListener('click', function(){ show(t); });
    t.addEventListener('keydown', function(e){
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); show(n);
    });
  });
  if (tabs.length){
    show(tabs[0], true);
    counted = false;
    var chara = document.querySelector('.chara');
    if ('IntersectionObserver' in window){
      new IntersectionObserver(function(es, io){
        if (es[0].isIntersecting){ countUp(); io.disconnect(); }
      }, {threshold: .3}).observe(chara);
    } else countUp();
  }

  // 技能：移上去或点一下，下面说明它用在了哪里
  var info = document.querySelector('.sk-info');
  document.querySelectorAll('.sk').forEach(function(b){
    function on(){
      document.querySelectorAll('.sk.on').forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      info.innerHTML = '<b>' + b.textContent + '</b>：' + b.dataset.use;
    }
    b.addEventListener('mouseenter', on); b.addEventListener('focus', on); b.addEventListener('click', on);
  });

  // 点角色：跳一下
  var fig = document.querySelector('.chara-fig');
  var cat = document.querySelector('.chara-cat'), petTimer = null;
  if (cat) cat.addEventListener('click', function(e){
    e.stopPropagation();
    clearTimeout(petTimer);
    cat.classList.remove('belly'); void cat.offsetWidth; cat.classList.add('belly');
    sfx('cat');
    petTimer = setTimeout(function(){ cat.classList.remove('belly'); }, 1500);
  });
  if (fig) fig.addEventListener('click', function(){
    fig.classList.remove('jump'); void fig.offsetWidth; fig.classList.add('jump');
    sfx('jump');
    setTimeout(function(){ fig.classList.remove('jump'); }, 560);
  });

  /* ---------- 游戏机 ---------- */
  var con = document.getElementById('console');
  var lib = document.getElementById('g-lib');
  if (!con || !lib) return;
  var scr = {
    cover: con.querySelector('.sc-cover'), plat: con.querySelector('.sc-plat'), title: con.querySelector('.sc-title'),
    stat: con.querySelector('.sc-stat'), hrs: con.querySelector('.sc-h b'), bar: con.querySelector('.sc-bar i'), note: con.querySelector('.sc-note')
  };
  var slotCart = con.querySelector('.c-cart');
  var cur = null, busy = false, hTimer = 0;

  function carts(){ return [].slice.call(lib.querySelectorAll('.cart:not(.more-cart)')).filter(function(c){ return !c.hidden; }); }
  function data(c){
    var tags = c.dataset.tags.split(' ');
    var h = parseInt(c.querySelector('.hrs').textContent, 10) || 0;
    var note = c.querySelector('.note-l');
    return {
      img: c.querySelector('.cover').getAttribute('src'),
      title: c.querySelector('h4').textContent,
      plat: tags[0],
      stat: tags.indexOf('白金') >= 0 ? '<span class="px-ico trophy"></span>白金' : tags.indexOf('通关') >= 0 ? '主线通关' : '',
      hrsText: c.querySelector('.hrs').textContent, h: h,
      note: note ? note.textContent : '',
      color: c.style.getPropertyValue('--c')
    };
  }
  function paint(c){
    var d = data(c);
    scr.cover.src = d.img; scr.cover.alt = '《' + d.title + '》封面';
    scr.plat.textContent = d.plat; scr.title.textContent = d.title;
    scr.stat.innerHTML = d.stat; scr.note.textContent = d.note;
    slotCart.style.setProperty('--c', d.color);
    scr.bar.style.width = '0';
    cancelAnimationFrame(hTimer);
    var t0 = performance.now(), suf = d.hrsText.replace(/^\d+/, '');
    (function f(t){
      var k = reduce ? 1 : Math.min(1, (t - t0) / 700);
      scr.hrs.textContent = Math.round(d.h * (1 - Math.pow(1 - k, 3))) + suf;
      if (k < 1) hTimer = requestAnimationFrame(f);
    })(t0);
    requestAnimationFrame(function(){ scr.bar.style.width = Math.min(100, d.h / 10) + '%'; });
  }
  function boot(cls){
    con.classList.remove('boot', 'swap'); void con.offsetWidth; con.classList.add(cls);
    setTimeout(function(){ con.classList.remove(cls); }, 500);
  }
  function seat(c, how){
    if (cur && cur !== c) cur.classList.remove('out');
    cur = c; c.classList.add('out');
    if (window.ysRack && c.classList.contains('pg-off')){ var p = pageOf(c); go(p, true); }
    var wasOn = con.classList.contains('on');
    con.classList.add('on');
    paint(c);
    boot(wasOn && how !== 'fly' ? 'swap' : 'boot');
  }

  // 卡带飞进插槽
  function insert(c){
    if (busy || c === cur) return;
    var cover = c.querySelector('.cover');
    var from = cover.getBoundingClientRect();
    var slot = con.querySelector('.c-slot').getBoundingClientRect();
    var visible = function(r){ return r.bottom > 0 && r.top < innerHeight; };
    sfx('coin');
    if (reduce || !visible(from) || !visible(slot) || slot.top < 0){
      seat(c);
      var cr = con.getBoundingClientRect();
      if (cr.top < 60 || cr.bottom > innerHeight) con.scrollIntoView({block: 'center', behavior: reduce ? 'auto' : 'smooth'});
      return;
    }
    busy = true;
    var fly = document.createElement('img');
    fly.className = 'cart-fly'; fly.src = cover.getAttribute('src'); fly.alt = '';
    fly.style.left = from.left + 'px'; fly.style.top = from.top + 'px';
    fly.style.width = from.width + 'px'; fly.style.height = from.height + 'px';
    document.body.appendChild(fly);
    c.classList.add('out');
    var tw = slot.width - 24, s = tw / from.width;
    var dx = slot.left + 12 - from.left, dy = slot.top - 30 - from.top;
    var anim = fly.animate([
      {transform: 'translate(0,0) scale(1) rotate(0)'},
      {transform: 'translate(' + dx * 0.55 + 'px,' + (dy * 0.55 - 60) + 'px) scale(' + (1 + s) / 2 + ') rotate(-8deg)', offset: .55},
      {transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ') rotate(0)', offset: .85},
      {transform: 'translate(' + dx + 'px,' + (dy + 40) + 'px) scale(' + s + ') rotate(0)', opacity: 0}
    ], {duration: 620, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'forwards'});
    anim.onfinish = function(){ fly.remove(); busy = false; seat(c, 'fly'); sfx('bump'); };
  }
  function eject(){
    if (!cur) return;
    cur.classList.remove('out');
    var c = cur; cur = null;
    con.classList.remove('on');
    if (!reduce) c.animate([{transform: 'translateY(-24px)'}, {transform: 'none'}], {duration: 300, easing: 'cubic-bezier(.3,.7,.4,1)'});
    sfx('door');
  }
  function step(d){
    var list = carts(); if (!list.length) return;
    var i = cur ? list.indexOf(cur) : -1;
    var n = list[(i + d + list.length) % list.length];
    if (i < 0 && d < 0) n = list[list.length - 1];
    seat(n); sfx('select');
  }
  function press(btn){ btn.classList.add('press'); setTimeout(function(){ btn.classList.remove('press'); }, 120); }

  carts().forEach(function(c){
    c.tabIndex = 0;
    c.setAttribute('role', 'button');
    c.setAttribute('aria-label', '把《' + c.querySelector('h4').textContent + '》插进游戏机');
    c.addEventListener('click', function(){ if (!lib._swiped) insert(c); });
    c.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); insert(c); } });
  });
  var bL = con.querySelector('.d-l'), bR = con.querySelector('.d-r'), bA = con.querySelector('.b-a'), bB = con.querySelector('.b-b');
  bL.addEventListener('click', function(){ step(-1); });
  bR.addEventListener('click', function(){ step(1); });
  bA.addEventListener('click', function(){
    var list = carts().filter(function(c){ return c !== cur; });
    if (list.length){ seat(list[Math.floor(Math.random() * list.length)]); sfx('coin'); }
  });
  bB.addEventListener('click', eject);
  con.addEventListener('keydown', function(e){
    if (e.target !== con) return;
    if (e.key === 'ArrowLeft'){ e.preventDefault(); press(bL); step(-1); }
    else if (e.key === 'ArrowRight'){ e.preventDefault(); press(bR); step(1); }
    else if (e.key === 'a' || e.key === 'A'){ press(bA); bA.click(); }
    else if (e.key === 'b' || e.key === 'B'){ press(bB); eject(); }
  });

  /* ---------- 卡带架分页：每页两行，列数跟着宽度走 ---------- */
  var rack = document.querySelector('.rack');
  var dots = rack.querySelector('.pg-dots'), pgN = rack.querySelector('.pg-n');
  var page = 0, pages = 1;
  function cols(){ return getComputedStyle(lib).gridTemplateColumns.split(' ').filter(Boolean).length || 1; }
  function shown(){ return [].slice.call(lib.querySelectorAll('.cart')).filter(function(c){ return !c.hidden; }); }
  function render(p, dir){
    var list = shown(), per = cols() * 2;
    pages = Math.max(1, Math.ceil(list.length / per));
    page = Math.max(0, Math.min(pages - 1, p));
    list.forEach(function(c, i){ c.classList.toggle('pg-off', Math.floor(i / per) !== page); });
    dots.innerHTML = '';
    for (var k = 0; k < pages; k++){
      var d = document.createElement('button');
      d.type = 'button'; d.setAttribute('role', 'tab'); d.setAttribute('aria-label', '第 ' + (k + 1) + ' 页');
      d.setAttribute('aria-selected', k === page ? 'true' : 'false');
      (function(k){ d.addEventListener('click', function(){ go(k); }); })(k);
      dots.appendChild(d);
    }
    pgN.textContent = (page + 1) + ' / ' + pages;
    rack.classList.toggle('single', pages < 2);
    if (dir && !reduce) lib.animate([{opacity: 0, transform: 'translateX(' + dir * 48 + 'px)'}, {opacity: 1, transform: 'none'}], {duration: 360, easing: 'cubic-bezier(.22,.8,.24,1)'});
  }
  function go(p, quiet){
    var n = (p + pages) % pages;
    if (n === page) return;
    var dir = p > page ? 1 : -1;
    render(n, dir);
    if (!quiet) sfx('select');
  }
  function pageOf(c){ var i = shown().indexOf(c); return i < 0 ? page : Math.floor(i / (cols() * 2)); }
  rack.querySelector('.pg-prev').addEventListener('click', function(){ go(page - 1); });
  rack.querySelector('.pg-next').addEventListener('click', function(){ go(page + 1); });
  // 横向轻扫 / 触控板横滑翻页
  var sw = null;
  lib.addEventListener('pointerdown', function(e){ sw = {x: e.clientX, y: e.clientY, id: e.pointerId}; });
  lib.addEventListener('pointerup', function(e){
    if (!sw || e.pointerId !== sw.id) return;
    var dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5){ go(page + (dx < 0 ? 1 : -1)); lib._swiped = true; setTimeout(function(){ lib._swiped = false; }, 0); }
  });
  var wAcc = 0, wT = 0;
  lib.addEventListener('wheel', function(e){
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    var t = performance.now(); if (t - wT > 300) wAcc = 0; wT = t;
    wAcc += e.deltaX;
    if (Math.abs(wAcc) > 80){ go(page + (wAcc > 0 ? 1 : -1)); wAcc = 0; wT = t + 400; }
  }, {passive: false});
  var lastCols = 0;
  addEventListener('resize', function(){ var c = cols(); if (c !== lastCols){ lastCols = c; render(page); } });
  window.ysRack = {refresh: function(p){ render(p || 0); }};
  lastCols = cols();
  render(0);
})();
