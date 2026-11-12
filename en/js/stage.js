/* 首页选关舞台：小人可以左右跑、跳起来顶方块，顶到哪块就读取哪个存档。
   键盘：← → 或 A D 移动，空格 / ↑ / W 跳，Enter 直接读取当前存档。
   鼠标 / 触屏：点方块直接读取，点门直接进入；触屏另有左右和跳跃按钮。
   没人操作时，小人会在方块之间来回走，广告牌跟着轮播。 */
(function(){
  var stg = document.getElementById('stg');
  if (!stg) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sfx = window.ysSfx || function(){};

  var SLOTS = [
    {href:'projects/nightreign-mod.html', tip:'Two fights against the same Nightlord can bring different enemies on the first two days.', img:['../img/mod/cover-cards.webp'], badge:'Beta released',
     kicker:'Save 01 · Playable · Solo project', title:'ELDEN RING NIGHTREIGN Content Expansion Mod', text:'Adds 7 Nightlords, 12 Night Laws and a two-layer Lake of Rot terrain, and reworks growth and drops for 30 talismans. Eight days after the beta: ~6,000 views on Bilibili and 331 shares across two platforms.', short:'Nightreign'},
    {href:'projects/tidewheel.html', tip:'The recall-bounce window was widened from about 0.5 s to about 1.6 s, measured by a script that simulates player input.', img:['../img/tidewheel/cover.webp'], badge:'Playable on itch.io',
     kicker:'Save 02 · Playable · Designer (and part-time programmer)', title:'Tidewheel', text:'Throw a clockwork gear to stop time on the sea around it, and frozen waves become terrain you can stand on. A thatgamejam #02 entry by a team of 4.', short:'Tidewheel'},
    {href:'projects/burger/index.html', tip:'First prestige at about 49 minutes; with the star bonus, the second run drops to 23 minutes and the third to 11.', img:['../img/burger/02_home.webp','../img/burger/12c_run_burst.webp','../img/burger/19_space_home.webp'], badge:'Development complete · software copyright pending',
     kicker:'Save 03 · Playable · Solo project', title:'Cosmic Burger', text:'A vertical incremental management mini-game for Douyin. Pacing was tuned with a self-built run simulator, keeping the first prestige at about 49 minutes.', short:'Cosmic Burger'},
    {href:'projects/naruto.html', tip:'Ranked duels mask combat stats; account power pays off in the leaderboard, guild modes and the Peak Duel.', img:['../img/naruto/main.webp'], badge:'45 pp · MDA',
     kicker:'Save 04 · System teardown', title:'Naruto Mobile: Progression and Economy Systems', text:'An MDA-layered teardown of two kinds of fairness: ranked matches protect skill-based fairness, while power-based modes reward investment. Compares four ways to obtain an S-rank ninja by face value, cash, time and risk (face values differ by about 25×) and proposes 3 improvements in priority order.', short:'Naruto'},
    {href:'projects/hearthstone.html', tip:'Once two copies of your target are taken, the chance of seeing it per refresh falls from 15% to 8%.', img:['../img/hs/main.webp'], badge:'35 pp · probability model',
     kicker:'Save 05 · System teardown', title:'Hearthstone Battlegrounds: Economy and Match Pacing', text:'Models the gold curve and tavern-upgrade pacing: 46% of base gold in the first 10 turns goes to upgrades. A pool probability model explains copy scarcity and reading opponents; the top proposal is validated in two steps, a usability test and a match-level experiment.', short:'Battlegrounds'}
  ];
  /* 页面加载后空闲时预取全部广告牌图片，切换存档时直接从缓存显示 */
  window.addEventListener('load', function(){
    (window.requestIdleCallback || function(f){ setTimeout(f, 300); })(function(){
      SLOTS.forEach(function(s){ s.img.forEach(function(src){ var im = new Image(); im.decoding = 'async'; im.src = src; }); });
    });
  });
  var DOOR = {href:'about.html', tip:'Games, film and music, background and skills.'};

  /* ---------- 搭场景 ---------- */
  var row = stg.querySelector('.sblocks');
  var blocks = SLOTS.map(function(s, i){
    var b = document.createElement('button');
    b.className = 'sblock'; b.type = 'button';
    b.setAttribute('aria-label', 'Load save 0' + (i + 1) + ': ' + s.title);
    b.innerHTML = '<span class="lbl"><b>0' + (i + 1) + '</b><span>' + s.short + '</span></span>';
    row.appendChild(b);
    return b;
  });
  var door = stg.querySelector('.door');
  var hero = stg.querySelector('.hero-p');
  var cat = document.createElement('div');
  cat.className = 'hero-cat px-cat'; cat.setAttribute('aria-hidden', 'true');
  stg.appendChild(cat);
  var say = hero.querySelector('.say');
  var board = stg.querySelector('.board');
  var scr = board.querySelector('.board-scr');
  var bdKicker = board.querySelector('.kicker'), bdTitle = board.querySelector('h2'), bdText = board.querySelector('p'), bdBadge = board.querySelector('.badge');

  var W = 0, H = 0, G = 0, slotX = [], doorX = 0, BLOCK_BOTTOM = 216, BW = 48, narrow = false;
  function layout(){
    // 手机屏幕偏矮时，广告牌会压住方块：按广告牌实际高度撑高舞台，方块离地高度不变，仍能跳着顶到
    stg.style.minHeight = '';
    var need = board.offsetTop + board.offsetHeight + 20 + 44 + 48 + BLOCK_BOTTOM;
    if (need > stg.clientHeight) stg.style.minHeight = need + 'px';
    W = stg.clientWidth; H = stg.clientHeight; G = H - 48;
    narrow = W < 640;
    // 宽屏时左侧留出操作说明木牌的位置
    var left = narrow ? 0.1 : Math.max(0.14, 260 / W), right = 0.74;
    slotX = SLOTS.map(function(_, i){ return Math.round(W * (left + (right - left) * i / (SLOTS.length - 1))); });
    doorX = Math.round(W * (narrow ? 0.9 : 0.88));
    blocks.forEach(function(b, i){ b.style.left = slotX[i] + 'px'; });
    door.style.left = doorX + 'px';
    if (P.x === null) P.x = slotX[0] + 40;
    P.x = Math.min(Math.max(P.x, 18), W - 18);
    if (C.x === null) C.x = Math.max(36, P.x - 64);
    C.x = Math.max(36, Math.min(W - 36, C.x));
    trail = []; catTime = 0;
    if (P.ground) P.y = G;
    pointArrow();
  }

  /* ---------- 广告牌 ---------- */
  var shown = -1;
  function showSlot(i){
    if (i === shown) return;
    shown = i;
    var s = SLOTS[i];
    blocks.forEach(function(b, k){ b.classList.toggle('on', k === i); });
    scr.querySelectorAll('img,.phones').forEach(function(n){ n.remove(); });
    var media;
    if (s.img.length > 1){
      media = document.createElement('div'); media.className = 'phones';
      s.img.forEach(function(src){ var im = new Image(); im.src = src; im.alt = ''; media.appendChild(im); });
    } else {
      media = new Image(); media.src = s.img[0]; media.alt = s.title;
    }
    scr.insertBefore(media, scr.firstChild);
    scr.classList.remove('flick'); void scr.offsetWidth; scr.classList.add('flick');
    bdKicker.textContent = s.kicker; bdTitle.textContent = s.title; bdText.textContent = s.text; bdBadge.textContent = s.badge;
    pointArrow();
  }
  function pointArrow(){
    if (shown < 0 || !W) return;
    var br = board.getBoundingClientRect(), sr = stg.getBoundingClientRect();
    var x = slotX[shown] + sr.left - br.left;
    x = Math.max(16, Math.min(br.width - 16, x));
    board.style.setProperty('--arrow', x + 'px');
  }
  board.querySelector('.go').addEventListener('click', function(){ userAct(); goTo(shown); });
  var coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
  var HINT = coarse ? 'Tap a block to enter' : '← → walk, Space to jump!', DOOR_SAY = coarse ? 'Tap the door' : '↓ Enter';

  /* ---------- 小人 ---------- */
  var P = {x:null, y:0, vx:0, vy:0, ground:true, face:1, dist:0, full:false};
  var C = {x:null, face:1, dist:0, moving:false}, trail = [], catTime = 0;
  var SPEED = 300, GRAV = 2300, JUMP = 840, HALF = 16, HEIGHT = 64;
  var keys = {}, attract = !reduce, attractIdx = 0, attractWait = 0, locked = false, jumpHeld = false;
  var wasDoor = null, hinting = true;

  function userAct(){ if (attract){ attract = false; } }
  function moved(){ if (hinting){ hinting = false; wasDoor = null; } }
  // 点方块、按 Enter、点广告牌按钮：方块当场弹一下，直接读取，不再等小人跑过去
  function goTo(i){
    if (locked || i < 0) return;
    hit(i);
  }
  function enter(i){
    locked = true;
    var s = SLOTS[i];
    setTimeout(function(){ window.ysLoad(s.href, 'Load save 0' + (i + 1), s.tip); }, reduce ? 0 : 200);
    setTimeout(function(){ locked = false; }, 2500);
  }
  function hit(i){
    var b = blocks[i];
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    var p = document.createElement('span'); p.className = 'pop'; b.appendChild(p);
    setTimeout(function(){ p.remove(); }, 650);
    window.ysCoin && window.ysCoin('stage-0' + (i + 1));
    sfx('coin');
    showSlot(i);
    enter(i);
  }
  function enterDoor(){
    locked = true; sfx('door');
    door.classList.add('open');
    setTimeout(function(){ window.ysLoad(DOOR.href, 'Open player profile', DOOR.tip); }, 300);
    setTimeout(function(){ locked = false; door.classList.remove('open'); }, 2500);
  }

  blocks.forEach(function(b, i){
    b.addEventListener('click', function(e){ e.preventDefault(); userAct(); goTo(i); });
    b.addEventListener('mouseenter', function(){ if (!locked) showSlot(i); });
    b.addEventListener('focus', function(){ showSlot(i); });
  });
  door.addEventListener('click', function(){ userAct(); if (!locked) enterDoor(); });

  /* ---------- 输入 ---------- */
  var inView = true;
  new IntersectionObserver(function(es){ inView = es[0].intersectionRatio > 0.35; }, {threshold:[0, .35, .6]}).observe(stg);
  var MAP = {ArrowLeft:'l', KeyA:'l', ArrowRight:'r', KeyD:'r', Space:'j', ArrowUp:'j', KeyW:'j', ArrowDown:'d', KeyS:'d'};
  addEventListener('keydown', function(e){
    if (!inView || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.key === 'Enter' && t && t.closest && t.closest('a,button')) return;
    var k = MAP[e.code];
    if (e.key === 'Enter'){ e.preventDefault(); userAct(); if (nearDoor()) enterDoor(); else if (shown >= 0) goTo(shown); return; }
    if (!k) return;
    e.preventDefault(); userAct(); moved();
    if (k === 'j' && !keys.j) jumpHeld = true;
    keys[k] = true;
    if ((k === 'j' || k === 'd') && nearDoor() && P.ground && k === 'd') enterDoor();
  });
  addEventListener('keyup', function(e){ var k = MAP[e.code]; if (k){ keys[k] = false; if (k === 'j') jumpHeld = false; } });
  addEventListener('blur', function(){ keys = {}; });
  stg.querySelectorAll('.touch button').forEach(function(btn){
    var k = btn.getAttribute('data-k');
    function on(e){ e.preventDefault(); userAct(); moved(); keys[k] = true; if (k === 'j') jumpHeld = true; btn.classList.add('down'); }
    function off(){ keys[k] = false; if (k === 'j') jumpHeld = false; btn.classList.remove('down'); }
    btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off);
    btn.addEventListener('pointerleave', off); btn.addEventListener('pointercancel', off);
  });

  function nearDoor(){ return Math.abs(P.x - doorX) < 30 && P.ground; }

  /* ---------- 物理 ---------- */
  function step(dt){
    var want = 0;
    if (keys.l) want -= 1;
    if (keys.r) want += 1;
    var doJump = false;
    if (attract){
      var tx = slotX[attractIdx] + 40;
      var ddx = tx - P.x;
      if (Math.abs(ddx) > 6){ want = ddx > 0 ? 0.6 : -0.6; }
      else {
        attractWait += dt;
        if (attractWait > 3.2){ attractWait = 0; attractIdx = (attractIdx + 1) % SLOTS.length; }
      }
    }
    if (keys.j && P.ground && jumpHeld){ doJump = true; jumpHeld = false; }
    if (doJump && !locked){ P.vy = -JUMP; P.ground = false; P.full = false; sfx('jump'); }

    P.vx = want * SPEED;
    if (want) P.face = want > 0 ? 1 : -1;
    if (locked) P.vx = 0;
    P.x += P.vx * dt;
    P.x = Math.min(Math.max(P.x, HALF + 2), W - HALF - 2);
    if (P.ground && P.vx) P.dist += Math.abs(P.vx * dt);

    // 竖直方向
    if (!P.ground){
      if (P.vy < 0 && !keys.j && !P.full) P.vy += GRAV * dt * 1.2; // 松开跳跃键时提前下落
      P.vy += GRAV * dt;
      var head0 = P.y - HEIGHT;
      P.y += P.vy * dt;
      var head = P.y - HEIGHT;
      var bBot = H - BLOCK_BOTTOM;
      if (P.vy < 0 && head0 >= bBot && head < bBot){
        for (var i = 0; i < slotX.length; i++){
          if (Math.abs(P.x - slotX[i]) < BW / 2 + HALF - 4){
            P.y = bBot + HEIGHT; P.vy = 60; sfx('bump');
            if (!locked) hit(i);
            break;
          }
        }
      }
      if (P.y >= G){ P.y = G; P.vy = 0; P.ground = true; }
    }

    // 广告牌跟着小人
    var best = -1, bd = 1e9;
    for (var j = 0; j < slotX.length; j++){ var d = Math.abs(P.x - slotX[j]); if (d < bd){ bd = d; best = j; } }
    var gap = slotX.length > 1 ? (slotX[1] - slotX[0]) : 200;
    if (best >= 0 && bd < gap * 0.55 && !locked) showSlot(best);

    // 头顶气泡：开场提示操作，走到门前提示进门
    var atDoor = nearDoor();
    if (atDoor !== wasDoor){
      wasDoor = atDoor;
      say.textContent = atDoor ? DOOR_SAY : HINT;
      say.classList.toggle('on', atDoor || hinting);
      say.classList.toggle('cue', !atDoor && hinting);
    }
  }

  function draw(){
    var frame;
    if (!P.ground) frame = 6;
    else if (Math.abs(P.vx) > 1) frame = Math.floor(P.dist / 22) % 6;
    else frame = 7;
    hero.style.backgroundPosition = (-frame * 72) + 'px 0';
    hero.style.transform = 'translate(' + Math.round(P.x - 36) + 'px,' + Math.round(P.y - 72) + 'px) scaleX(' + P.face + ')';
    hero.style.setProperty('--flip', P.face);
    var cf = reduce ? 4 : !P.ground ? 4 : C.moving ? Math.floor(C.dist / 16) % 4 : 4 + Math.floor(catTime / .6) % 2;
    cat.style.backgroundPosition = (-cf * 72) + 'px 0';
    cat.style.transform = 'translate(' + Math.round(C.x - 36) + 'px,' + (G - 48) + 'px) scaleX(' + C.face + ')';
  }

  // 记录主角的地面位置，约 0.3 秒后跟随；跳跃时留在地面抬头。
  function follow(dt){
    if (reduce){ C.moving = false; return; }
    catTime += dt;
    trail.push({t:catTime, x:P.x, face:P.face});
    while (trail.length > 1 && trail[1].t <= catTime - .3) trail.shift();
    C.moving = false;
    if (!P.ground || !trail.length || trail[0].t > catTime - .3) return;
    var past = trail[0], target = Math.max(36, Math.min(W - 36, past.x - past.face * 64));
    var dx = target - C.x;
    if (Math.abs(dx) > 2){
      var move = Math.sign(dx) * Math.min(Math.abs(dx), 420 * dt);
      C.x += move; C.dist += Math.abs(move); C.moving = true;
      C.face = dx > 0 ? 1 : -1;
    } else { C.x = target; C.face = past.face; }
  }

  var last = 0;
  function loop(t){
    var dt = Math.min(0.033, (t - last) / 1000 || 0); last = t;
    if (inView && W){ step(dt); follow(dt); draw(); }
    requestAnimationFrame(loop);
  }

  layout();
  P.y = G;
  showSlot(0);
  draw();
  addEventListener('resize', layout);
  addEventListener('load', layout);
  addEventListener('pageshow', function(){ locked = false; door.classList.remove('open'); });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function(e){
    reduce = e.matches;
    if (reduce) attract = false;
    trail = []; catTime = 0; draw();
  });
  requestAnimationFrame(function(t){ last = t; requestAnimationFrame(loop); });
})();
