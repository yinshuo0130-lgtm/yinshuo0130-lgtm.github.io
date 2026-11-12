/* 殷硕 · 作品集：全站脚本
   1. 读档加载条：首次进站、站内跳转时，小人从左跑到右，沿途吃掉硬币，到旗子处跳起后进入页面。
   2. 硬币：页面里的存档方块可以顶出硬币，计数存在 localStorage，HUD 右上角显示。
   3. 云朵、滚动渐显。
   页面在 <html data-root="../"> 上写明到站点根目录的相对路径。 */
(function(){
  var root = document.documentElement.getAttribute('data-root') || '';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KEY = 'ys-coins';

  /* ---------- 8 位音效（只在玩家操作时响，可在顶栏静音） ---------- */
  var actx = null, muted = false;
  try { muted = localStorage.getItem('ys-mute') === '1'; } catch(e){}
  function tone(f0, f1, dur, type, when, vol){
    var t = actx.currentTime + (when || 0);
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var SFX = {
    jump: function(){ tone(260, 620, 0.14, 'square'); },
    bump: function(){ tone(140, 90, 0.08, 'triangle', 0, 0.12); },
    coin: function(){ tone(988, 0, 0.07, 'square', 0, 0.05); tone(1319, 0, 0.28, 'square', 0.07, 0.05); },
    select: function(){ tone(660, 0, 0.04, 'square', 0, 0.035); },
    cat: function(){ tone(1047, 1568, 0.12, 'triangle', 0, 0.045); },
    door: function(){ tone(220, 330, 0.12, 'triangle', 0, 0.1); tone(330, 440, 0.12, 'triangle', 0.1, 0.1); },
    clear: function(){ [523, 659, 784, 1047].forEach(function(f, i){ tone(f, 0, 0.16, 'square', i * 0.11, 0.045); }); },
    secret: function(){ [784, 740, 622, 440, 415, 659, 831, 1047].forEach(function(f, i){ tone(f, 0, 0.12, 'square', i * 0.09, 0.04); }); }
  };
  window.ysSfx = function(name){
    if (muted || !SFX[name]) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      SFX[name]();
    } catch(e){}
  };

  /* ---------- 硬币 ---------- */
  function got(){ try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ return {}; } }
  function put(o){ try { localStorage.setItem(KEY, JSON.stringify(o)); } catch(e){} }
  var hudCoins = document.querySelector('.hud-coins');
  function showCount(bump){
    if (!hudCoins) return;
    var n = Object.keys(got()).length;
    hudCoins.querySelector('b').textContent = '×' + (n < 10 ? '0' + n : n);
    if (bump){ hudCoins.classList.remove('bump'); void hudCoins.offsetWidth; hudCoins.classList.add('bump'); }
  }
  showCount(false);
  document.querySelectorAll('.px-block[data-coin]').forEach(function(b){
    var id = b.getAttribute('data-coin');
    if (got()[id]) b.classList.add('used');
    b.addEventListener('click', function(){
      if (b.classList.contains('used')){ window.ysSfx('bump'); return; }
      window.ysCoin(id);
      b.classList.add('used', 'hit');
      var p = document.createElement('span'); p.className = 'pop'; b.appendChild(p);
      setTimeout(function(){ p.remove(); b.classList.remove('hit'); }, 700);
      window.ysSfx('coin');
    });
  });
  window.ysCoin = function(id){
    var o = got(); if (o[id]) return false;
    o[id] = 1; put(o); showCount(true); return true;
  };

  /* ---------- 顶栏静音按钮 ---------- */
  var hudIn = document.querySelector('.hud-in');
  if (hudIn && hudCoins){
    var mb = document.createElement('button');
    mb.className = 'hud-mute'; mb.type = 'button';
    function paintMute(){ mb.textContent = muted ? '♪ OFF' : '♪ ON'; mb.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off'); mb.setAttribute('aria-pressed', muted ? 'false' : 'true'); }
    paintMute();
    mb.addEventListener('click', function(){ muted = !muted; try { localStorage.setItem('ys-mute', muted ? '1' : '0'); } catch(e){} paintMute(); window.ysSfx('select'); });
    hudIn.insertBefore(mb, hudCoins);
  }

  /* ---------- 顶栏右上角：语言切换 ----------
     简体中文页面在站点根目录，其余语言在 /zh-hant/、/en/、/ja/ 下，目录结构相同。
     语言名写成 \u 转义，多语言构建脚本不会把它们当成待翻译文字。 */
  if (hudIn){
    var LANGS = [['zh-hans', '\u7b80', '\u7b80\u4f53\u4e2d\u6587'], ['zh-hant', '\u7e41', '\u7e41\u9ad4\u4e2d\u6587'],
                 ['en', 'EN', 'English'], ['ja', '\u65e5', '\u65e5\u672c\u8a9e']];
    var HREFLANG = {'zh-hans': 'zh-Hans', 'zh-hant': 'zh-Hant', 'en': 'en', 'ja': 'ja'};
    var segs = location.pathname.split('/'), cur = 'zh-hans';
    if (['zh-hant', 'en', 'ja'].indexOf(segs[1]) >= 0){ cur = segs[1]; segs.splice(1, 1); }
    var rest = segs.join('/') || '/';
    var lw = document.createElement('div'); lw.className = 'hud-lang';
    var lb = document.createElement('button'); lb.type = 'button';
    lb.setAttribute('aria-haspopup', 'true'); lb.setAttribute('aria-expanded', 'false'); lb.setAttribute('aria-label', 'Language');
    var lm = document.createElement('div'); lm.className = 'hud-lang-menu'; lm.hidden = true;
    LANGS.forEach(function(L){
      if (L[0] === cur) lb.innerHTML = '<span>' + L[1] + '</span><i></i>';
      var a = document.createElement('a');
      a.href = (L[0] === 'zh-hans' ? '' : '/' + L[0]) + rest + location.hash;
      a.textContent = L[2]; a.lang = HREFLANG[L[0]]; a.hreflang = HREFLANG[L[0]];
      if (L[0] === cur) a.setAttribute('aria-current', 'true');
      lm.appendChild(a);
    });
    function langOpen(on){ lm.hidden = !on; lb.setAttribute('aria-expanded', on ? 'true' : 'false'); }
    lb.addEventListener('click', function(e){ e.stopPropagation(); langOpen(lm.hidden); window.ysSfx('select'); });
    document.addEventListener('click', function(e){ if (!lw.contains(e.target)) langOpen(false); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') langOpen(false); });
    lw.appendChild(lb); lw.appendChild(lm);
    hudIn.appendChild(lw);
  }

  /* ---------- 外部链接一律新标签页打开，作品集这边留着 ---------- */
  document.querySelectorAll('a[href^="http"]').forEach(function(a){
    try { if (new URL(a.href).origin !== location.origin){ a.target = '_blank'; a.rel = 'noopener'; } } catch(e){}
  });

  /* ---------- 底部关卡进度条：小人跟着滚动位置往右走 ---------- */
  var prog = document.createElement('div');
  prog.className = 'px-prog'; prog.setAttribute('aria-hidden', 'true');
  prog.innerHTML = '<i class="bar"></i><i class="man"></i><i class="goal"></i>';
  document.body.appendChild(prog);
  var pBar = prog.querySelector('.bar'), pMan = prog.querySelector('.man'), lastY = scrollY, pDist = 0, pTimer = null;
  // 滚动时只改 transform，并合并到每帧一次；页面总高只在尺寸变化时重新量，避免滚动中反复触发重排
  var pMax = 0, pTick = 0;
  function measure(){
    pMax = document.documentElement.scrollHeight - innerHeight;
    prog.classList.toggle('on', pMax > innerHeight * 0.8);
    paint();
  }
  function paint(){
    pTick = 0;
    var k = pMax > 0 ? Math.min(1, Math.max(0, scrollY / pMax)) : 0;
    pBar.style.transform = 'scaleX(' + k + ')';
    var dy = scrollY - lastY; lastY = scrollY;
    pDist += Math.abs(dy);
    pMan.style.transform = 'translateX(' + Math.round(k * (innerWidth - 24)) + 'px)' + (dy < 0 ? ' scaleX(-1)' : '');
    pMan.style.backgroundPosition = (-(Math.floor(pDist / 40) % 6) * 24) + 'px 0';
    clearTimeout(pTimer);
    pTimer = setTimeout(function(){ pMan.style.backgroundPosition = '-168px 0'; }, 180);
  }
  function onScroll(){ if (!pTick) pTick = requestAnimationFrame(paint); }
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', measure);
  addEventListener('load', measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
  measure();

  /* ---------- 隐藏彩蛋：↑↑↓↓←→←→BA 下一场硬币雨 ---------- */
  var KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA'], kpos = 0, partyTimer = null;
  addEventListener('keydown', function(e){
    kpos = (e.code === KONAMI[kpos]) ? kpos + 1 : (e.code === KONAMI[0] ? 1 : 0);
    if (kpos < KONAMI.length) return;
    kpos = 0;
    window.ysSfx('secret');
    window.ysCoin('secret-konami');
    clearTimeout(partyTimer);
    document.body.classList.add('cat-party');
    partyTimer = setTimeout(function(){ document.body.classList.remove('cat-party'); }, 5000);
    var rain = document.createElement('div'); rain.className = 'coinrain';
    for (var i = 0; i < 60; i++){
      var c = document.createElement('i');
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.animationDuration = (1.4 + Math.random() * 1.6) + 's, .4s';
      c.style.animationDelay = (Math.random() * 1.2) + 's, 0s';
      rain.appendChild(c);
    }
    var toast = document.createElement('div'); toast.className = 'px-toast'; toast.textContent = 'Secret level: coin rain!';
    document.body.appendChild(rain); document.body.appendChild(toast);
    setTimeout(function(){ rain.remove(); toast.remove(); }, 4200);
  });

  /* ---------- 云朵 ---------- */
  if (document.body.classList.contains('px-sky')){
    var sky = document.createElement('div'); sky.className = 'px-clouds'; sky.setAttribute('aria-hidden','true');
    [[8,70,-10],[22,95,-55],[4,120,-80],[30,80,-30]].forEach(function(c){
      var i = document.createElement('i');
      i.style.top = c[0] + 'vh'; i.style.animationDuration = c[1] + 's'; i.style.animationDelay = c[2] + 's';
      sky.appendChild(i);
    });
    document.body.prepend(sky);
  }

  /* ---------- 滚动渐显 ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){
    es.forEach(function(en){ if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
  }, {rootMargin:'0px 0px -6% 0px'}) : null;
  document.querySelectorAll('[data-r]').forEach(function(el){ io ? io.observe(el) : el.classList.add('in'); });

  /* ---------- 读档加载条 ---------- */
  var L = document.createElement('div');
  L.className = 'px-loader'; L.setAttribute('aria-hidden','true');
  L.innerHTML = '<div class="box"><div class="slot"></div><p class="tip"></p>' +
    '<div class="track"><div class="lane"></div><div class="fill"></div><div class="flag"></div><div class="runner"></div><div class="loader-cat px-cat" aria-hidden="true"></div></div>' +
    '<div class="pct">0%</div><div class="skip">Click anywhere to skip</div></div>';
  document.body.appendChild(L);
  var runner = L.querySelector('.runner'), fill = L.querySelector('.fill'), track = L.querySelector('.track'), pct = L.querySelector('.pct');
  var running = null;
  var loaderCat = L.querySelector('.loader-cat');

  function run(slot, tip, ms, done){
    L.querySelector('.slot').textContent = slot;
    L.querySelector('.tip').textContent = tip || '';
    track.querySelectorAll('.coin').forEach(function(c){ c.remove(); });
    var marks = [0.2, 0.4, 0.6, 0.8];
    var coins = marks.map(function(m){
      var c = document.createElement('i'); c.className = 'coin'; c.style.left = (m * 100) + '%'; track.appendChild(c); return c;
    });
    runner.classList.remove('jump');
    loaderCat.classList.remove('pounce', 'sit');
    loaderCat.classList.add('run');
    L.classList.add('on');
    var t0 = performance.now(), finished = false;
    function end(){
      if (finished) return; finished = true;
      runner.classList.add('jump');
      loaderCat.classList.remove('run', 'pounce');
      loaderCat.classList.add('sit');
      pct.textContent = '100%';
      fill.style.width = '92%';
      setTimeout(done, reduce ? 0 : 220);
    }
    function frame(now){
      var k = Math.min(1, (now - t0) / ms);
      var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      var x = e * 0.92;
      runner.style.left = (x * 100) + '%';
      if (!reduce) loaderCat.style.left = 'calc(' + (x * 100) + '% - 76px)';
      // 先由主角起跳，小咪随后扑向旗子，100% 时坐下。
      if (k >= .88) runner.classList.add('jump');
      if (k >= .93){ loaderCat.classList.remove('run'); loaderCat.classList.add('pounce'); }
      fill.style.width = (x * 100) + '%';
      pct.textContent = (k < 1 ? Math.min(99, Math.round(e * 100)) : 100) + '%';
      marks.forEach(function(m, i){ if (x >= m && !coins[i].classList.contains('got')) coins[i].classList.add('got'); });
      if (k < 1) running = requestAnimationFrame(frame); else end();
    }
    running = requestAnimationFrame(frame);
    L.onclick = function(){ cancelAnimationFrame(running); end(); };
  }
  function hide(){ L.classList.remove('on'); }

  // 首次进站：每个会话只播一次
  var first = false;
  try { first = !sessionStorage.getItem('ys-booted'); sessionStorage.setItem('ys-booted','1'); } catch(e){}
  if (first && !reduce){
    run('PRESS START', 'Yin Shuo · Game Design Portfolio', 800, hide);
  }

  // 站内跳转：读取页面上写好的读档提示。
  // 过场只在每个会话的前两次跳转放完整时长，之后缩短：看第三个作品的人已经看过这段动画了。
  var NAV_MS = 620;
  try {
    var navs = +sessionStorage.getItem('ys-navs') || 0;
    if (navs >= 2) NAV_MS = 320;
    sessionStorage.setItem('ys-navs', navs + 1);
  } catch(e){}
  function internal(a){
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    var href = a.getAttribute('href') || '';
    if (!href || href[0] === '#' || /^(mailto:|tel:|javascript:)/.test(href)) return false;
    if (/\.(pdf|zip)$/i.test(href)) return false;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return false;
    if (u.pathname === location.pathname && u.hash) return false;
    return true;
  }
  document.addEventListener('click', function(e){
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a');
    if (!internal(a)) return;
    e.preventDefault();
    var href = a.href;
    if (reduce){ location.href = href; return; }
    run(a.getAttribute('data-slot') || 'Load Save', a.getAttribute('data-tip') || '', NAV_MS, function(){ location.href = href; });
  });
  window.ysLoad = function(href, slot, tip){
    if (reduce){ location.href = href; return; }
    run(slot || 'Load Save', tip || '', NAV_MS, function(){ location.href = href; });
  };
  addEventListener('pageshow', function(e){ if (e.persisted) hide(); });

  function ready(){ document.documentElement.classList.add('ready'); }
  requestAnimationFrame(function(){ requestAnimationFrame(ready); });
  setTimeout(ready, 120);
})();

/* 表格：给每个单元格记下列名，手机上按卡片逐行显示（样式见 site.css 的 table.stack） */
(function(){
  [].forEach.call(document.querySelectorAll('table'), function(t){
    var head = t.querySelector('tr');
    if (!head || !head.querySelector('th')) return;
    var labels = [].map.call(head.children, function(c){ return c.textContent.trim(); });
    head.classList.add('thead');
    t.classList.add('stack');
    [].forEach.call(t.querySelectorAll('tr'), function(tr){
      if (tr === head) return;
      [].forEach.call(tr.children, function(td, i){ if (labels[i]) td.setAttribute('data-label', labels[i]); });
    });
  });
})();

/* 拆解页图表：点一下在新标签页打开原图，手机上可以放大看 */
(function(){
  [].forEach.call(document.querySelectorAll('.fig.chart img'), function(im){
    im.style.cursor = 'zoom-in';
    im.addEventListener('click', function(){ window.open(im.currentSrc || im.src, '_blank', 'noopener'); });
  });
})();
