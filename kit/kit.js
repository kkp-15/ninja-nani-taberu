/* kkp-kit 共通の動き（D4）。<script src="kit/kit.js" defer></script> で読む。
   - 季節: <html data-k-season="..."> を月で付ける（10〜11月=紅葉 / 12月=雪 / 1月=松竹梅 / 3〜4月=桜）。?season=momiji で確認できる
   - 押したとき: 静かに沈むだけ（CSS）。墨の粒がはねる動きは 2026-10-20 にやめた（清潔感）
   - 霞の奥行き: .k-par を付けた飾りがスクロールでほんの少し遅れて動く
   - 動き: .k-play-on を付けた要素が画面に入ったら .k-play を付ける（巻物・判子のアニメ）
   - 部品の手伝い（2026-10-20〜）: KKit.toast / KKit.countdown / KKit.reveal / KKit.share / KKit.install。
     .k-install[data-k-key] と [data-k-share] は書いておくだけで自動でつながる
   - 演出の部品: KKit.fx.slash（札を刀で斬る）・KKit.fx.shuriken（手裏剣が飛んできて刺さる）。下の fxParts を見る
   - 配信の土台（2026-10-21〜）: KKit.stream / KKit.live / KKit.openView / KKit.view / KKit.resume / KKit.twice / KKit.fitText / KKit.streamTitle。下の streamParts を見る。
     読み込み時に使うページは kit.js を defer なしで <head> に置く（本体の script より先に KKit が要るため）
   - 遊びの部品（2026-10-22〜）: KKit.die（サイコロ）・KKit.wheel（ルーレット盤）・KKit.gateArt（ゲートの絵・canvas 用）。下の gameParts を見る
   動きを減らす設定（prefers-reduced-motion）では、季節と部品の手伝い以外は何もしない（演出の部品は動かさずに、すぐ結果の合図だけ出す）。 */
(function () {
  var root = document.documentElement;
  var m = /[?&]season=([a-z]+)/.exec(location.search);
  var month = new Date().getMonth() + 1;
  var season = m ? m[1] : ({ 10: 'momiji', 11: 'momiji', 12: 'yuki', 1: 'shochikubai', 3: 'sakura', 4: 'sakura' }[month] || '');
  if (season) root.setAttribute('data-k-season', season);

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  fxParts();
  helpers();
  streamParts();
  gameParts();
  if (reduce) return;

  function start() {
    var pars = document.querySelectorAll('.k-par'), ticking = false;
    if (pars.length) {
      var par = function () {
        ticking = false;
        var k = window.innerWidth < 600 ? .03 : .06;
        pars.forEach(function (el) {
          var box = el.parentNode.getBoundingClientRect();
          el.style.transform = 'translateY(' + (-box.top * k).toFixed(1) + 'px)';
        });
      };
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true });
      par();
    }
    var plays = document.querySelectorAll('.k-play-on');
    if (plays.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('k-play'); io.unobserve(e.target); } });
      }, { threshold: .1 });
      plays.forEach(function (el) { io.observe(el); });
    } else {
      plays.forEach(function (el) { el.classList.add('k-play'); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  /* ===== 部品の手伝い（2026-10-20〜） =====
     KKit.toast(文, ms)            画面の下に短い知らせ（既定 2200ms）。1つの札を使い回す
     KKit.countdown(n, { onDone, sound, step })  3・2・1 を真ん中に出す（step は1つの長さ ms・既定 800）。sound(数) で呼び出し側が鳴らす
     KKit.reveal(要素)             .k-reveal / .k-reveal-fuda / .k-reveal-stamp を出し直す（hidden も外す）
     KKit.share({ url, title, text })  端末の共有画面。なければ URL をコピーして toast。URL に ?d=YYYYMMDD を付ける
     KKit.install(要素, { key, desktop })  ホーム画面に追加バナー。.k-install[data-k-key] は自動で呼ばれる */
  function helpers() {
    var K = window.KKit = window.KKit || {};
    var toastEl = null, toastT = 0;
    K.toast = function (msg, ms) {
      if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'k-toast';
        toastEl.setAttribute('role', 'status');
        toastEl.setAttribute('aria-live', 'polite');
        document.body.appendChild(toastEl);
      }
      toastEl.textContent = msg == null ? '' : String(msg);
      toastEl.offsetWidth; // 出し直しのため
      toastEl.classList.add('k-on');
      clearTimeout(toastT);
      toastT = setTimeout(function () { toastEl.classList.remove('k-on'); }, ms || 2200);
      return toastEl;
    };

    K.countdown = function (n, o) {
      o = o || {};
      var step = o.step || 800, box = document.createElement('div'), span = document.createElement('span');
      box.className = 'k-countdown'; box.setAttribute('aria-live', 'assertive');
      box.appendChild(span); document.body.appendChild(box);
      var left = n || 3, t = 0, stopped = false;
      function tick() {
        if (stopped) return;
        if (left <= 0) { box.remove(); if (typeof o.onDone === 'function') o.onDone(); return; }
        span.textContent = left;
        span.classList.remove('k-on'); span.offsetWidth; span.classList.add('k-on');
        if (typeof o.sound === 'function') try { o.sound(left); } catch (e) {}
        left--; t = setTimeout(tick, step);
      }
      tick();
      return { stop: function () { stopped = true; clearTimeout(t); box.remove(); } };
    };

    K.reveal = function (el) {
      if (typeof el === 'string') el = document.querySelector(el);
      if (!el) return;
      el.hidden = false;
      el.classList.remove('k-on'); el.offsetWidth; el.classList.add('k-on');
      return el;
    };

    function ymd() { var d = new Date(); return '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
    K.share = function (o) {
      o = o || {};
      var u;
      try { u = new URL(o.url || location.href, location.href); u.hash = ''; u.searchParams.set('d', ymd()); u = u.toString(); } catch (e) { u = o.url || location.href; }
      var data = { url: u, title: o.title || document.title };
      if (o.text) data.text = o.text;
      function copy() {
        var done = function () { K.toast(o.copied || 'リンクをコピーしました'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, function () { K.toast(u, 5000); });
        else K.toast(u, 5000);
      }
      if (navigator.share) navigator.share(data).catch(function (e) { if (!e || e.name !== 'AbortError') copy(); });
      else copy();
    };

    K.install = function (el, o) {
      if (typeof el === 'string') el = document.querySelector(el);
      if (!el || el._kInstall) return; el._kInstall = true;
      o = o || {};
      var key = o.key || el.getAttribute('data-k-key') || 'kkp_install_dismissed';
      var desktop = o.desktop || el.getAttribute('data-k-desktop') === '1';
      var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
      if (standalone) return;
      try { if (localStorage.getItem(key) === '1') return; } catch (e) { return; }
      var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      if (!ios && !touch && !desktop) return; // PC では出さない（浮いて見えるため）
      var go = el.querySelector('.k-install-go'), x = el.querySelector('.k-install-x'), how = el.querySelector('.k-install-how'), hint = el.querySelector('.k-install-t span');
      var deferred = null;
      function place() {
        var fix = document.querySelector('.k-fix');
        var h = fix && fix.offsetParent !== null ? fix.getBoundingClientRect() : null;
        el.style.setProperty('--k-install-bottom', (h && h.bottom >= window.innerHeight - 2 ? Math.round(h.height) + 12 : 12) + 'px');
      }
      function show() { place(); el.hidden = false; }
      function dismiss() { el.hidden = true; try { localStorage.setItem(key, '1'); } catch (e) {} }
      if (x) x.addEventListener('click', dismiss);
      if (ios) {
        if (hint && !hint.getAttribute('data-k-keep')) hint.textContent = 'Safari の共有ボタンから追加できます';
        if (go) { go.textContent = 'やり方'; go.addEventListener('click', function () { if (how) { how.hidden = !how.hidden; go.textContent = how.hidden ? 'やり方' : 'とじる'; } }); }
        setTimeout(show, o.delay == null ? 3000 : o.delay);
      } else {
        window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; show(); });
        if (go) go.addEventListener('click', function () {
          if (!deferred) return;
          deferred.prompt();
          deferred.userChoice.then(function (c) { if (c.outcome === 'accepted') dismiss(); deferred = null; });
        });
      }
      window.addEventListener('resize', function () { if (!el.hidden) place(); }, { passive: true });
    };

    function auto() {
      [].forEach.call(document.querySelectorAll('.k-install[data-k-key]'), function (el) { K.install(el); });
      document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-k-share]');
        if (!b) return;
        e.preventDefault();
        K.share({ url: b.getAttribute('data-k-url') || undefined, title: b.getAttribute('data-k-title') || undefined, text: b.getAttribute('data-k-text') || undefined });
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
  }

  /* ===== 配信の土台（2026-10-21〜） =====
     KKit.stream.init({ key })      配信モードかどうか（PC幅768以上・?mode=stream で入る・?mode=normal で出る）。<html data-k-stream> を付ける
     KKit.stream.set(on, params)    切り替え。URL の #… と mode= を消してから読み直す（#付きだと読み直さない不具合の再発防止）
     KKit.stream.on / can() / noAds()  いま配信中か／PC幅か（?kkptest=1 ならスマホでも可）／広告を読まないか
     KKit.live({ ch, role, onState, onHello })  BroadcastChannel＋localStorage の同期。op は send(state)・hold(true/false)・connected()
                                    .k-live[data-k-live="ch"] の札を自動で「つながっています／つながっていません」に
     KKit.openView({ url, ch, name })  表示ページを別窓 1280x720 で開く（開けたら true）。操作画面は動かさない
     .k-view-open[data-k-view][data-k-ch]  開く・URLをコピー・背景3択・OBS の1行を作る。開いたら 'k-view-open' の event
     KKit.view({ ch })              /view/ 側: 背景（?bg= ＞ 操作画面の選択 ＞ cream）を <html data-k-bg> に。idle(true/false) で待ち画面
     KKit.resume({ key, box, label, onResume, onDiscard, live, ttl })  続きから（既定12時間・この端末だけ）。選ぶまで live を止める
     KKit.twice(要素, { text, ms, when, ok })  回が消える操作の2回押し。when() が false なら1回で ok
     KKit.fitText(要素, { min, max, lines })   字を縮めて lines 行（既定1）に収める。min（px）より小さくしない
     KKit.streamTitle(要素, { key, onChange })  「〇〇の」タイトル欄（12字・空なら「みんな」・端末に覚える） */
  function streamParts() {
    var K = window.KKit = window.KKit || {};
    var ls = {
      get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
      del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
    };
    function $el(x) { return typeof x === 'string' ? document.querySelector(x) : x; }
    function ready(f) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f); else f(); }
    function call(f, a, b) { if (typeof f === 'function') try { return f(a, b); } catch (e) { setTimeout(function () { throw e; }); } }

    /* --- 配信モード --- */
    var ST = K.stream = {
      key: 'k-stream', on: false,
      can: function () { return !!window.__kkpTest || !!(window.matchMedia && matchMedia('(min-width:768px)').matches); },
      noAds: function () { return ST.on || !!window.__kkpTest; },
      init: function (o) {
        o = o || {}; if (o.key) ST.key = o.key;
        var q = location.search;
        if (/[?&]mode=normal\b/.test(q)) ls.del(ST.key);
        else if (/[?&]mode=stream\b/.test(q) && ST.can()) ls.set(ST.key, '1');
        ST.on = ST.can() && ls.get(ST.key) === '1';
        if (ST.on) {
          root.setAttribute('data-k-stream', '');
          try { history.scrollRestoration = 'manual'; } catch (e) {}
          ready(function () { window.scrollTo(0, 0); });
        } else root.removeAttribute('data-k-stream');
        return ST.on;
      },
      set: function (on, params) {
        on = !!on && ST.can();
        if (on) ls.set(ST.key, '1'); else ls.del(ST.key);
        var u;
        try { u = new URL(location.href); } catch (e) { location.reload(); return; }
        u.hash = ''; u.searchParams.delete('mode');
        if (params) Object.keys(params).forEach(function (k) { if (params[k] == null) u.searchParams.delete(k); else u.searchParams.set(k, params[k]); });
        try { history.replaceState(null, '', u.pathname + u.search); } catch (e) {}
        location.reload();
      }
    };

    /* --- 同期（操作画面 ⇄ 表示ページ。同じブラウザの中だけ） --- */
    var lives = {};
    K.live = function (o) {
      o = o || {};
      var ch = o.ch || 'k-live', key = 'k-live:' + ch, hkey = 'k-live-hello:' + ch, TTL = o.ttl || 12 * 3600 * 1000;
      var bc = null; try { bc = new BroadcastChannel(ch); } catch (e) {}
      function post(m) { try { if (bc) bc.postMessage(m); } catch (e) {} }
      var api = { ch: ch };
      if (o.role === 'view') {
        var lastT = 0;
        var take = function (d) { if (!d || d.s === undefined || (d.t && d.t < lastT)) return; lastT = d.t || Date.now(); call(o.onState, d.s, d); };
        if (bc) bc.addEventListener('message', function (e) { var m = e.data || {}; if (m.k === 's') take(m.d); });
        window.addEventListener('storage', function (e) { if (e.key === key && e.newValue) { try { take(JSON.parse(e.newValue)); } catch (x) {} } });
        var hello = function () { post({ k: 'hello', t: Date.now() }); ls.set(hkey, String(Date.now())); };
        api.start = function () {
          try { var d = JSON.parse(ls.get(key) || 'null'); if (d && d.t && Date.now() - d.t < TTL) take(d); else call(o.onState, null); } catch (e) { call(o.onState, null); }
          hello(); setInterval(hello, 3000);
          return api;
        };
        return api;
      }
      // op（操作画面）
      var last = 0, held = false, cur = null, pend = null, firstSent = 0;
      function paint() {
        var on = Date.now() - last < 7000;
        [].forEach.call(document.querySelectorAll('.k-live[data-k-live="' + ch + '"]'), function (b) {
          b.classList.toggle('k-on', on);
          b.textContent = '表示ページ：' + (on ? 'つながっています' : 'つながっていません');
        });
      }
      function heard() { var first = Date.now() - last > 7000; last = Date.now(); paint(); if (first) { call(o.onHello); if (cur && !held) post({ k: 's', d: cur }); } }
      if (bc) bc.addEventListener('message', function (e) { var m = e.data || {}; if (m.k === 'hello') heard(); });
      window.addEventListener('storage', function (e) { if (e.key === hkey) heard(); });
      setInterval(paint, 1000); ready(paint);
      api.send = function (state) {
        if (held) { pend = { s: state }; return; }
        cur = { t: Date.now(), s: state }; pend = null;
        ls.set(key, JSON.stringify(cur)); post({ k: 's', d: cur });
      };
      api.hold = function (b) { held = !!b; if (!held && pend) api.send(pend.s); };
      api.held = function () { return held; };
      api.connected = function () { return Date.now() - last < 7000; };
      api.paint = paint;
      lives[ch] = api;
      return api;
    };

    /* --- 表示ページを開く --- */
    var BG = ['cream', 'green', 'clear'];
    function bgOf(ch) { var b = ls.get('k-view-bg:' + ch); return BG.indexOf(b) >= 0 ? b : 'cream'; }
    function viewUrl(o) { var b = bgOf(o.ch || ''); return (o.url || '/view/') + (b === 'cream' ? '' : ((o.url || '').indexOf('?') >= 0 ? '&' : '?') + 'bg=' + b); }
    K.openView = function (o) {
      o = o || {};
      var w = null; try { w = window.open(viewUrl(o), o.name || 'kView', 'popup=yes,width=1280,height=720'); } catch (e) {}
      if (w && o.ch && lives[o.ch]) setTimeout(function () { lives[o.ch].paint(); }, 600);
      return !!w;
    };
    var HOW = {
      cream: 'OBS の「ウィンドウキャプチャ」でこの窓を取り込む',
      green: 'ウィンドウキャプチャで取り込み、フィルタの「クロマキー」で緑を消す',
      clear: '背景なし（ウィンドウキャプチャでは白く映ります）'
    };
    K.viewOpen = function (el, o) {
      el = $el(el); if (!el || el._kvo) return; el._kvo = true; o = o || {};
      var url = o.url || el.getAttribute('data-k-view') || '/view/', ch = o.ch || el.getAttribute('data-k-ch') || '', name = o.name || el.getAttribute('data-k-name') || 'kView';
      el.innerHTML = '<button type="button" class="k-btn k-btn-sub k-vo-go">表示ページを別ウィンドウで開く</button>'
        + '<button type="button" class="k-btn k-btn-sub k-vo-copy">URLをコピー</button>'
        + '<div class="k-seg k-vo-bg" role="group" aria-label="表示ページの背景"><button type="button" data-bg="cream">クリーム</button><button type="button" data-bg="green">緑</button><button type="button" data-bg="clear">透過</button></div>'
        + '<p class="k-vo-how"></p><p class="k-vo-msg" role="status" hidden>ポップアップを許可して、もう一度押してください</p>';
      var how = el.querySelector('.k-vo-how'), msg = el.querySelector('.k-vo-msg');
      function paint() { var b = bgOf(ch); [].forEach.call(el.querySelectorAll('[data-bg]'), function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-bg') === b)); }); how.textContent = HOW[b]; }
      el.querySelector('.k-vo-go').addEventListener('click', function () {
        var ok = K.openView({ url: url, ch: ch, name: name });
        msg.hidden = ok;
        el.dispatchEvent(new CustomEvent('k-view-open', { bubbles: true, detail: { ok: ok } }));
      });
      el.querySelector('.k-vo-copy').addEventListener('click', function () {
        var u = location.origin + viewUrl({ url: url, ch: ch });
        var done = function () { if (K.toast) K.toast('表示ページのURLをコピーしました'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, function () { if (K.toast) K.toast(u, 6000); });
        else if (K.toast) K.toast(u, 6000);
      });
      el.querySelector('.k-vo-bg').addEventListener('click', function (e) {
        var b = e.target.closest('[data-bg]'); if (!b) return;
        ls.set('k-view-bg:' + ch, b.getAttribute('data-bg')); paint();
      });
      paint();
      return { paint: paint };
    };

    /* --- 表示ページ側の枠 --- */
    K.view = function (o) {
      o = o || {};
      var ch = o.ch || '', m = /[?&]bg=(cream|green|clear)\b/.exec(location.search), fixed = m ? m[1] : '';
      function apply() { root.setAttribute('data-k-bg', fixed || bgOf(ch)); }
      apply();
      if (!fixed) window.addEventListener('storage', function (e) { if (e.key === 'k-view-bg:' + ch) apply(); });
      var stage = null, idleT = null;
      window.addEventListener('resize', function () { clearTimeout(idleT); idleT = setTimeout(function () { var t = stage && !stage.querySelector('.k-view-idle').hidden && stage.querySelector('.k-view-idle b,.k-view-idle-t'); if (t) K.fitText(t, { min: 42 }); }, 150); });
      return {
        bg: function () { return root.getAttribute('data-k-bg'); },
        idle: function (on, title) {
          stage = stage || document.querySelector(o.stage || '.k-view-stage');
          if (!stage) return;
          stage.classList.toggle('k-idle', !!on);
          var box = stage.querySelector('.k-view-idle');
          if (box) {
            box.hidden = !on;
            if (on && title != null) { var t = box.querySelector('b,.k-view-idle-t'); if (t && t.textContent !== title) { t.textContent = title; K.fitText(t, { min: 42 }); } }
          }
        }
      };
    };

    /* --- 続きから --- */
    K.resume = function (o) {
      o = o || {};
      var key = o.key || 'k-resume', TTL = o.ttl || 12 * 3600 * 1000, live = o.live || null, api = { pending: false };
      api.save = function (data) { ls.set(key, JSON.stringify({ at: Date.now(), data: data })); };
      api.clear = function () { ls.del(key); };
      var run = null; try { run = JSON.parse(ls.get(key) || 'null'); } catch (e) {}
      if (!run || !run.data || !run.at || Date.now() - run.at > TTL || (o.valid && !o.valid(run.data))) { if (run) ls.del(key); return api; }
      var box = $el(o.box);
      if (!box) return api;
      var ago = Math.max(0, Math.round((Date.now() - run.at) / 60000));
      var agoT = ago < 1 ? 'たった今' : ago < 60 ? ago + '分前' : Math.floor(ago / 60) + '時間前';
      var lab = call(o.label, run.data);
      box.classList.add('k-resume');
      box.innerHTML = '<p></p><button type="button" class="k-btn k-btn-main k-btn-sm" data-k-go>続きから</button><button type="button" class="k-btn k-btn-sub k-btn-sm" data-k-del>消して新しく</button>';
      box.querySelector('p').textContent = '前回の続きがあります（' + (lab ? lab + '・' : '') + agoT + '）';
      box.hidden = false; api.pending = true;
      if (live) live.hold(true);
      function close() { box.hidden = true; api.pending = false; }
      box.querySelector('[data-k-go]').addEventListener('click', function () { close(); call(o.onResume, run.data); if (live) live.hold(false); });
      box.querySelector('[data-k-del]').addEventListener('click', function () { close(); ls.del(key); call(o.onDiscard); if (live) live.hold(false); });
      return api;
    };

    /* --- 2回押し --- */
    K.twice = function (el, o) {
      el = $el(el); if (!el) return; o = o || {};
      var armed = false, t = 0, saved = '';
      function disarm() {
        if (!armed) return; armed = false; clearTimeout(t);
        if (el.textContent === o.text) el.innerHTML = saved;
        el.classList.remove('k-twice-on');
      }
      el.addEventListener('click', function (e) {
        if (el.disabled) return;
        if (o.when && !o.when()) { disarm(); call(o.ok, e); return; }
        if (!armed) {
          armed = true; saved = el.innerHTML; el.textContent = o.text || 'もう一度押すと決定'; el.classList.add('k-twice-on');
          t = setTimeout(disarm, o.ms || 3000); return;
        }
        disarm(); call(o.ok, e);
      });
      return { disarm: disarm, armed: function () { return armed; } };
    };

    /* --- 字を縮めて収める --- */
    K.fitText = function (el, o) {
      el = $el(el); if (!el) return 0; o = o || {};
      var lines = o.lines || 1;
      el.style.fontSize = '';
      if (lines === 1) { el.style.whiteSpace = 'nowrap'; el.style.overflow = 'hidden'; el.style.textOverflow = 'ellipsis'; }
      var max = o.max || parseFloat(getComputedStyle(el).fontSize) || 16, min = Math.min(o.min || 14, max);
      function fits() {
        if (el.scrollWidth > el.clientWidth) return false;
        if (lines > 1) {
          var cs = getComputedStyle(el), lh = parseFloat(cs.lineHeight);
          if (isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.3;
          if (el.scrollHeight > lh * lines + parseFloat(cs.paddingTop || 0) + parseFloat(cs.paddingBottom || 0) + 2) return false;
        }
        return true;
      }
      el.style.fontSize = max + 'px';
      if (!el.clientWidth || fits()) { el.style.fontSize = ''; return max; }
      var lo = min, hi = max;
      for (var i = 0; i < 12 && hi - lo > 0.5; i++) { var mid = (lo + hi) / 2; el.style.fontSize = mid + 'px'; if (fits()) lo = mid; else hi = mid; }
      lo = Math.max(min, Math.floor(lo) - (lines === 1 ? 1 : 0));   // 端数で「…」が出ないよう少し小さめに
      el.style.fontSize = lo + 'px';
      return lo;
    };

    /* --- 「〇〇の」タイトル --- */
    K.streamTitle = function (el, o) {
      el = $el(el); if (!el) return null; o = o || {};
      var key = o.key || el.getAttribute('data-k-key') || 'k-stream-title', inp = el.querySelector('input'), sp = el.querySelector('span');
      var suffix = o.suffix != null ? o.suffix : (sp ? sp.textContent : '');
      var max = o.max || 12;
      if (inp) { inp.maxLength = max; if (!inp.placeholder) inp.placeholder = 'みんな'; inp.value = (ls.get(key) || '').slice(0, max); }
      var api = {
        value: function () { return String(ls.get(key) || '').trim().slice(0, max); },
        text: function () { return (api.value() || 'みんな') + suffix; },
        set: function (v) { v = String(v || '').slice(0, max); ls.set(key, v.trim()); if (inp && inp.value !== v) inp.value = v; }
      };
      if (inp) {
        inp.addEventListener('input', function (e) { if (e.isComposing) return; ls.set(key, inp.value.trim().slice(0, max)); call(o.onChange, api.text()); });
        inp.addEventListener('compositionend', function () { ls.set(key, inp.value.trim().slice(0, max)); call(o.onChange, api.text()); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); inp.blur(); } });
      }
      return api;
    };

    ready(function () {
      [].forEach.call(document.querySelectorAll('.k-view-open[data-k-view]'), function (el) { K.viewOpen(el); });
    });
  }

  /* ===== 演出の部品 =====
     どのサイトでも1行で呼べる形。絵は kit.css が img/ から読む（JS は絵の場所を知らない）。
     長さ: speed に 'short'（0.6倍）・'normal'・'long'（1.5倍）か倍率の数。音は鳴らさず opts.sound(種類) で呼び出し側に知らせる。
     動きを減らす設定のときは、何も描かずに onCut / onHit / onDone をすぐ呼ぶ（結果だけ一瞬で出る）。

     KKit.fx.slash(host, opts)   host は position のある箱。札が出る → 刀が一閃 → 札が斜めに斬れて左右へ → 消える
       opts: speed / wait（斬るまでの溜め ms・既定 450）/ size（札の幅 px）/ color（印の色）/ ang（斬る角度・既定 25）
             onCut（斬れた瞬間。ここで結果を出す）/ onDone / sound('fuda'|'slash')
       戻り値: { tint(色, グラデ), cut()（溜めを飛ばしてすぐ斬る）, skip()（演出を消して onCut・onDone）, destroy() }
     KKit.fx.shuriken(host, opts) 手裏剣が画面の外から回りながら飛んできて (x, y) に刺さる。刺さったまま残る
       opts: x, y（host の中の px）/ size / speed / from（'right'|'left'|'top'・既定 'right'）/ onHit / sound('throw'|'hit')
       戻り値: { remove() }
     KKit.fx.clear(host)  host の中の演出を全部消す
     KKit.fx.ms(基準ms, speed)  長さの倍率をかけた ms（呼び出し側で時間を合わせるとき） */
  function fxParts() {
    var K = window.KKit = window.KKit || {};
    var SP = { short: 0.6, normal: 1, long: 1.5 };
    function k(sp) { return typeof sp === 'number' ? sp : (SP[sp] || 1); }
    function ms(base, sp) { return Math.round(base * k(sp)); }
    function mk(cls, parent) { var e = document.createElement('div'); e.className = cls; if (parent) parent.appendChild(e); return e; }
    function anim(el, frames, o) { try { return el.animate(frames, o); } catch (e) { return null; } }
    function call(f, a) { if (typeof f === 'function') try { f(a); } catch (e) { /* 呼び出し側の失敗で演出を止めない */ } }

    function clear(host) {
      if (!host) return;
      [].slice.call(host.querySelectorAll(':scope > .k-fx')).forEach(function (n) { if (n._kfx) n._kfx.destroy(); else n.remove(); });
    }

    function slash(host, o) {
      o = o || {};
      var done = false, cut = false, timers = [], root = null;
      var h = { tint: function () {}, cut: function () {}, skip: function () {}, destroy: function () {} };
      function finishCut() { if (cut) return; cut = true; call(o.onCut); }
      function finish() { if (done) return; done = true; finishCut(); call(o.onDone); }
      if (reduce || !host) { setTimeout(finish, 0); h.skip = finish; return h; }
      var W = host.clientWidth || 600, H = host.clientHeight || 400;
      var fw = o.size || Math.max(80, Math.min(W * 0.26, H * 0.62 / 1.5));
      var ang = o.ang == null ? 25 : o.ang;
      root = mk('k-fx', host);
      root.style.setProperty('--k-fx-w', fw + 'px');
      root.style.setProperty('--k-fx-ang', ang + 'deg');
      root.style.setProperty('--k-fx-len', Math.hypot(W, H) * 1.2 + 'px');
      root.style.setProperty('--k-fx-bw', fw * 2.1 + 'px');
      root.style.setProperty('--k-fx-ll', fw * 1.9 + 'px');
      root.style.setProperty('--k-fx-lh', Math.max(3, fw * 0.025) + 'px');
      if (o.color) root.style.setProperty('--k-fx-c', o.color);
      var fuda = mk('k-fx-fuda', root), halves = [];
      ['a', 'b'].forEach(function (c) { var hf = mk('k-fx-half ' + c, fuda), f = mk('k-fx-face', hf); mk('k-fx-seal', f); halves.push(hf); });
      var track = mk('k-fx-track', root), line = mk('k-fx-line', track), blade = mk('k-fx-blade', track);
      function at(t, fn) { timers.push(setTimeout(fn, t)); }
      // 1) 札が上から下りてくる
      anim(fuda, [{ transform: 'translate(-50%,-80%) rotate(-4deg)', opacity: 0 }, { transform: 'translate(-50%,-48%) rotate(1deg)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,-50%)', opacity: 1 }], { duration: ms(380, o.speed), easing: 'cubic-bezier(.2,.8,.3,1.2)', fill: 'both' });
      call(o.sound, 'fuda');
      var waitT = ms(380, o.speed) + (o.wait == null ? ms(450, o.speed) : o.wait), cutT = null;
      function doCut() {
        if (cutT !== null || done) return;
        timers.forEach(clearTimeout); timers = [];
        var sw = ms(240, o.speed);
        cutT = sw;
        // 2) 刀が一閃（左上から右下へ）と光の筋
        anim(blade, [{ left: '0%', opacity: 1 }, { left: '100%', opacity: 1, offset: 0.85 }, { left: '112%', opacity: 0 }], { duration: sw, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' });
        anim(line, [{ transform: 'translateY(-50%) scaleX(0)', opacity: 1 }, { transform: 'translateY(-50%) scaleX(1)', opacity: 1, offset: 0.55 }, { transform: 'translateY(-50%) scaleX(1)', opacity: 0 }], { duration: sw + ms(260, o.speed), easing: 'ease-out', fill: 'both' });
        call(o.sound, 'slash');
        // 3) 札が斜めにずれて左右へ離れ、消える（ここで結果を出す）
        at(Math.round(sw * 0.6), function () {
          var r = ang * Math.PI / 180, dx = Math.cos(r) * fw * 0.18, dy = Math.sin(r) * fw * 0.18, nx = Math.sin(r) * fw * 0.32, ny = Math.cos(r) * fw * 0.32;
          var d = ms(520, o.speed);
          anim(halves[0], [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (-dx * 0.4) + 'px,' + (-dy * 0.4) + 'px)', opacity: 1, offset: 0.25 }, { transform: 'translate(' + (-dx + nx) + 'px,' + (-dy - ny) + 'px) rotate(-7deg)', opacity: 0 }], { duration: d, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' });
          anim(halves[1], [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (dx * 0.4) + 'px,' + (dy * 0.4) + 'px)', opacity: 1, offset: 0.25 }, { transform: 'translate(' + (dx - nx) + 'px,' + (dy + ny + fw * 0.2) + 'px) rotate(6deg)', opacity: 0 }], { duration: d, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' });
          finishCut();
          at(d, function () { if (root && root.parentNode) root.remove(); finish(); });
        });
      }
      at(waitT, doCut);
      h.tint = function (c, g) {
        if (!root) return;
        if (c) root.style.setProperty('--k-fx-c', c);
        if (g) root.style.setProperty('--k-fx-g', g); else root.style.removeProperty('--k-fx-g');
        var ring = mk('k-fx-ring', root);
        var a = anim(ring, [{ transform: 'translate(-50%,-50%) scale(.6)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], { duration: 520, easing: 'ease-out', fill: 'both' });
        if (a) a.onfinish = function () { ring.remove(); }; else ring.remove();
        anim(fuda, [{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.06)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 260, easing: 'ease-out' });
      };
      h.cut = doCut;
      h.destroy = function () { timers.forEach(clearTimeout); timers = []; done = true; if (root && root.parentNode) root.remove(); };
      h.skip = function () { h.destroy(); done = false; finish(); };
      root._kfx = h;
      return h;
    }

    function shuriken(host, o) {
      o = o || {};
      var h = { remove: function () {} };
      if (reduce || !host) { setTimeout(function () { call(o.onHit); }, 0); return h; }
      var W = host.clientWidth || 600, H = host.clientHeight || 400, s = o.size || Math.max(40, Math.min(W, H) * 0.12);
      var root = mk('k-fx', host);
      root.style.setProperty('--k-fx-s', s + 'px');
      var x = o.x == null ? W / 2 : o.x, y = o.y == null ? H / 2 : o.y;
      var star = mk('k-fx-star', root), hit = mk('k-fx-hit', root);
      star.style.left = hit.style.left = x + 'px'; star.style.top = hit.style.top = y + 'px';
      var from = o.from || 'right', sx, sy;
      if (from === 'left') { sx = -x - s; sy = -Math.min(y, H * 0.3); }
      else if (from === 'top') { sx = W * 0.1; sy = -y - s; }
      else { sx = W - x + s; sy = -Math.min(y + s, H * 0.35); }
      var fl = ms(420, o.speed), endRot = 16 + Math.random() * 20;
      call(o.sound, 'throw');
      var a = anim(star, [{ transform: 'translate(' + sx + 'px,' + sy + 'px) rotate(-900deg) scale(.8)' }, { transform: 'translate(0,0) rotate(' + endRot + 'deg) scale(1.12)', offset: 0.9 }, { transform: 'translate(0,0) rotate(' + endRot + 'deg) scale(1)' }], { duration: fl, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'both' });
      var hitDone = false;
      function onHit() {
        if (hitDone) return; hitDone = true;
        call(o.sound, 'hit');
        anim(hit, [{ transform: 'scale(.5)', opacity: .8 }, { transform: 'scale(1.9)', opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'both' });
        anim(star, [{ transform: 'rotate(' + endRot + 'deg) scale(1)' }, { transform: 'rotate(' + (endRot - 4) + 'deg) scale(.96)' }, { transform: 'rotate(' + endRot + 'deg) scale(1)' }], { duration: 180, fill: 'forwards' });
        call(o.onHit);
      }
      if (a) a.onfinish = onHit; else onHit();
      setTimeout(onHit, fl + 60);   // 背景のタブなどで onfinish が来ないときの保険
      h.remove = function () { if (root.parentNode) root.remove(); };
      h.destroy = h.remove;
      root._kfx = h;
      return h;
    }

    K.fx = { slash: slash, shuriken: shuriken, clear: clear, ms: ms, speed: k, reduce: !!reduce };
  }

  /* ===== 遊びの部品（2026-10-22 第3波）: サイコロ・ルーレット盤・ゲートの絵 =====
     KKit.die(要素, 目, { roll, ms, onDone })  .k-die に目（1〜6）を SVG で描く。roll:true で1回だけ転がって止まる（動きを減らす設定では転がらない）
     KKit.wheel(要素, { items, colors, minPx })  .k-wheel にルーレット盤（D4 の濃淡で区切る・中央に家紋・上に墨の針）。
        戻り値 { set(items), spinTo(番号, { turns, ms, onDone }), at(角度), angle }。止まったあと左半分の字を180度回して逆さまにしない
     KKit.gateArt(基準パス)  canvas のゲーム用。のれんと柱の絵を読み、tint(色) で色を染めたのれん（canvas）を返す */
  function gameParts() {
    var K = window.KKit = window.KKit || {};
    var NS = 'http://www.w3.org/2000/svg';
    function $el(x) { return typeof x === 'string' ? document.querySelector(x) : x; }
    function svg(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
    function call(f, a) { if (typeof f === 'function') try { f(a); } catch (e) { setTimeout(function () { throw e; }); } }

    /* --- サイコロ --- */
    var PIPS = { 1: [[50, 50]], 2: [[27, 27], [73, 73]], 3: [[27, 27], [50, 50], [73, 73]], 4: [[27, 27], [73, 27], [27, 73], [73, 73]],
      5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]], 6: [[27, 25], [73, 25], [27, 50], [73, 50], [27, 75], [73, 75]] };
    function dieDefs() {
      if (document.getElementById('k-die-defs')) return;
      var s = svg('svg', { id: 'k-die-defs', width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden' });
      s.innerHTML = '<defs><linearGradient id="k-die-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f6ecda"/></linearGradient>'
        + '<radialGradient id="k-die-pip" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#3a322c"/><stop offset=".7" stop-color="#1f1a17"/><stop offset="1" stop-color="#0d0b0a"/></radialGradient>'
        + '<radialGradient id="k-die-pip-shu" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#e0583c"/><stop offset=".7" stop-color="#c93b23"/><stop offset="1" stop-color="#9e2c18"/></radialGradient></defs>';
      (document.body || document.documentElement).appendChild(s);
    }
    function drawDie(el, n) {
      n = Math.max(1, Math.min(6, n | 0 || 1));
      var shu = el.classList.contains('k-die-shu'), one = !el.classList.contains('k-die-plain');
      var s = el.querySelector('svg') || svg('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' }, el);
      while (s.firstChild) s.removeChild(s.firstChild);
      svg('rect', { x: 4, y: 8, width: 92, height: 88, rx: 18, fill: '#e3d3b6', stroke: '#1f1a17', 'stroke-width': 3 }, s);     // 下の厚み
      svg('rect', { x: 4, y: 4, width: 92, height: 88, rx: 18, fill: 'url(#k-die-face)', stroke: '#1f1a17', 'stroke-width': 3 }, s);
      svg('path', { d: 'M20 11 H80', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: '.9' }, s);           // 上の光
      var red = shu || (one && n === 1), r = n === 1 ? (one ? 15 : 11) : 9.5;
      PIPS[n].forEach(function (p) {
        var cy = 4 + p[1] * 0.88;   // 面（高さ88）の中に置く
        svg('circle', { cx: p[0], cy: cy, r: r, fill: red ? 'url(#k-die-pip-shu)' : 'url(#k-die-pip)' }, s);
        svg('path', { d: 'M' + (p[0] - r * 0.55) + ' ' + (cy + r * 0.62) + ' A' + r * 0.85 + ' ' + r * 0.85 + ' 0 0 0 ' + (p[0] + r * 0.62) + ' ' + (cy - r * 0.5), fill: 'none', stroke: '#fff', 'stroke-width': Math.max(1.2, r * 0.16), opacity: '.35', 'stroke-linecap': 'round' }, s);
      });
      el.setAttribute('data-face', n);
      if (!el.hasAttribute('role')) el.setAttribute('role', 'img');
      el.setAttribute('aria-label', 'サイコロ ' + n);
    }
    K.die = function (el, n, o) {
      el = $el(el); o = o || {}; if (!el) return;
      dieDefs();
      if (el._kDieT) { clearInterval(el._kDieT); el._kDieT = 0; }
      if (!o.roll || reduce) { drawDie(el, n); el.classList.remove('k-die-roll'); call(o.onDone, n); return; }
      var ms = o.ms || 620, t0 = Date.now(), last = 0;
      el.style.setProperty('--k-die-ms', ms + 'ms');
      el.classList.remove('k-die-roll'); void el.offsetWidth; el.classList.add('k-die-roll');
      drawDie(el, 1 + Math.floor(Math.random() * 6));
      el._kDieT = setInterval(function () {
        if (Date.now() - t0 >= ms * 0.72) { clearInterval(el._kDieT); el._kDieT = 0; drawDie(el, n); return; }
        var f; do { f = 1 + Math.floor(Math.random() * 6); } while (f === last); last = f; drawDie(el, f);
      }, 85);
      setTimeout(function () { el.classList.remove('k-die-roll'); call(o.onDone, n); }, ms + 20);
    };
    K.die.draw = function (el, n) { el = $el(el); if (el) { dieDefs(); drawDie(el, n); } };

    /* --- ルーレット盤 --- */
    // 濃淡: 朱（白字）・生成り（墨字）・オレンジ（墨字）・薄いオレンジ（墨字）。隣どうし・最後と最初が同じにならないように
    var WCOL = [['#c93b23', '#fff'], ['#fbf3e4', '#1f1a17'], ['#ff8a3d', '#1f1a17'], ['#f9d9b6', '#1f1a17']];
    function wheelColors(n, pal) {
      var out = [], i; for (i = 0; i < n; i++) out.push(pal[i % pal.length]);
      if (n > 1 && out[n - 1] === out[0]) out[n - 1] = pal[(n - 1) % pal.length === 0 ? 2 % pal.length : 1];
      if (n > 2 && out[n - 1] === out[n - 2]) out[n - 1] = pal[3 % pal.length];
      return out;
    }
    K.wheel = function (el, o) {
      el = $el(el); o = o || {};
      var W = { items: [], angle: 0, el: el }, R = 94, HUB = 27;   // HUB＝中央の家紋（ふちまで）の半径（盤の 200 単位で）
      el.classList.add('k-wheel'); el.innerHTML = '';
      var disc = document.createElement('div'); disc.className = 'k-wheel-disc'; el.appendChild(disc);
      var s = svg('svg', { viewBox: '-100 -100 200 200', 'aria-hidden': 'true', focusable: 'false' }, disc);
      var gSeg = svg('g', {}, s), gTxt = svg('g', {}, s);
      svg('circle', { r: R, fill: 'none', stroke: '#1f1a17', 'stroke-width': 4 }, s);
      var hub = document.createElement('div'); hub.className = 'k-wheel-hub'; el.appendChild(hub);
      var pin = document.createElement('div'); pin.className = 'k-wheel-pin'; el.appendChild(pin);
      var ps = svg('svg', { viewBox: '0 0 40 52', 'aria-hidden': 'true' }, pin);
      svg('path', { d: 'M20 50 L5 16 A16 16 0 1 1 35 16 Z', fill: '#1f1a17', stroke: '#fffdf8', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, ps);
      svg('circle', { cx: 20, cy: 15, r: 5.5, fill: '#c93b23' }, ps);
      var texts = [];
      function pt(a, r) { var t = a * Math.PI / 180; return [r * Math.sin(t), -r * Math.cos(t)]; }
      function scale() { var w = el.clientWidth || 300; return w / 200; }
      function layoutText() {
        var n = W.items.length, sc = scale(), min = (o.minPx || 14) / sc, step = 360 / Math.max(n, 1);
        texts.forEach(function (t, i) {
          var mid = (i + 0.5) * step, flip = Math.sin((mid + W.angle) * Math.PI / 180) < -0.02;
          var label = String(W.items[i]), len = Math.max(1, label.length);
          // 字の幅は1字＝1em とみなす。字の列の内側の端でも、隣のマスにはみ出さない大きさにする
          var half = Math.min(Math.PI / 2, step * Math.PI / 360);
          var fits = function (px, chars, rows) { var inner = R * 0.88 - px * chars; return inner >= HUB + 3 && 2 * inner * Math.sin(half) * 0.9 >= px * (rows * 1.12); };
          var best = function (chars, rows, top) { for (var p2 = top; p2 >= 6; p2 -= 0.5) if (fits(p2, chars, rows)) return p2; return 0; };
          var lines = [label], px = best(len, 1, 17);
          if (px < 15 / sc && len >= 4) {
            var h = Math.ceil(len / 2);
            while (h > 1 && /^[ーッャュョァィゥェォっゃゅょぁぃぅぇぉ、。）」]/.test(label.charAt(h))) h--;   // 2行目の頭に「ー」や小さい字を置かない
            var px2 = best(Math.max(h, len - h), 2, 16);
            if (px2 > px) { lines = [label.slice(0, h), label.slice(h)]; px = px2; }
          }
          if (px < min) {   // 入らない: 1行で末尾を省く
            px = min; var keep = 1; while (keep < len && fits(px, keep + 2, 1)) keep++;
            lines = [label.length > keep ? label.slice(0, keep) + '…' : label];
          }
          while (t.firstChild) t.removeChild(t.firstChild);
          // 左半分は180度回して、外側から中心へ読む向きに（逆さまにしない）
          var x = flip ? -(R * 0.88) : R * 0.88, lh = px * 1.12, y0 = -(lines.length - 1) * lh / 2;
          t.setAttribute('transform', 'rotate(' + (mid - 90 + (flip ? 180 : 0)) + ')');
          t.setAttribute('text-anchor', flip ? 'start' : 'end');
          lines.forEach(function (ln, k) {
            var tx = svg('text', { x: x.toFixed(2), y: (y0 + k * lh).toFixed(2), 'font-size': px.toFixed(2), 'dominant-baseline': 'central' }, t);
            tx.textContent = ln;
          });
        });
      }
      W.set = function (items) {
        W.items = (items || []).slice(); var n = W.items.length, step = 360 / Math.max(n, 1);
        var cols = wheelColors(n, o.colors || WCOL);
        while (gSeg.firstChild) gSeg.removeChild(gSeg.firstChild);
        while (gTxt.firstChild) gTxt.removeChild(gTxt.firstChild);
        texts = [];
        if (!n) { svg('circle', { r: R, fill: '#fbf3e4' }, gSeg); return W; }
        for (var i = 0; i < n; i++) {
          var a0 = i * step, a1 = (i + 1) * step, p0 = pt(a0, R), p1 = pt(a1, R);
          var d = n === 1 ? 'M0 -' + R + ' A' + R + ' ' + R + ' 0 1 1 0 ' + R + ' A' + R + ' ' + R + ' 0 1 1 0 -' + R + ' Z'
            : 'M0 0 L' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + R + ' ' + R + ' 0 ' + (step > 180 ? 1 : 0) + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + ' Z';
          svg('path', { d: d, fill: cols[i][0], stroke: '#1f1a17', 'stroke-width': 2, 'stroke-linejoin': 'round' }, gSeg);
          texts.push(svg('g', { fill: cols[i][1], class: 'k-wheel-t' }, gTxt));
        }
        layoutText();
        return W;
      };
      // 角度 a（盤の回転・度）のとき針の下にある番号
      W.at = function (a) { var n = W.items.length; if (!n) return -1; var pos = ((360 - (a % 360)) % 360 + 360) % 360; return Math.min(n - 1, Math.floor(pos / (360 / n))); };
      W.spinTo = function (idx, so) {
        so = so || {}; var n = W.items.length; if (!n) return;
        var step = 360 / n, jitter = (Math.random() - 0.5) * step * 0.6;
        var target = 360 - (idx + 0.5) * step + jitter, cur = W.angle % 360;
        var delta = ((target - cur) % 360 + 360) % 360 + 360 * (so.turns == null ? 5 : so.turns);
        var ms = reduce ? 0 : (so.ms || 3200);
        W.angle += delta;
        disc.style.transition = ms ? 'transform ' + ms + 'ms cubic-bezier(.12,.72,.14,1)' : 'none';
        disc.style.transform = 'rotate(' + W.angle + 'deg)';
        setTimeout(function () { layoutText(); call(so.onDone, idx); }, ms + 30);
      };
      if (typeof ResizeObserver === 'function') new ResizeObserver(function () { if (W.items.length) layoutText(); }).observe(el);
      W.set(o.items || []);
      return W;
    };

    /* --- ゲートの絵（canvas 用） --- */
    K.gateArt = function (base) {
      base = base == null ? 'kit/img/' : base;
      var A = { ready: false, noren: null, post: null, cache: {} };
      var n = 0, done = function () { if (++n === 2) A.ready = !!(A.noren && A.post); };
      function load(k, f) { var im = new Image(); im.onload = function () { A[k] = im; done(); }; im.onerror = done; im.src = base + f; }
      load('noren', 'k-gate-noren.webp'); load('post', 'k-gate-post.webp');
      // のれんの白い布だけを色で染める（輪郭・竿の茶はそのまま）。白→その色・布の影→少し濃い色。色ごとに1回だけ作る
      A.tint = function (col) {
        if (!A.noren) return null; if (A.cache[col]) return A.cache[col];
        var im = A.noren, c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        var x = c.getContext('2d'); x.drawImage(im, 0, 0);
        var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(col);
        if (!m) return im;
        var cr = parseInt(m[1], 16), cg = parseInt(m[2], 16), cb = parseInt(m[3], 16);
        try {
          var d = x.getImageData(0, 0, c.width, c.height), p = d.data;
          for (var i = 0; i < p.length; i += 4) {
            var r = p[i], g = p[i + 1], b = p[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            if (mx < 150 || mx - mn > 28) continue;          // 色のある所（竿）・暗い所（輪郭）は染めない
            var l = mx / 255, t = Math.min(1, (mx - 150) / 60);  // 明るさを残して染める（影は濃い色）
            p[i] = r + (cr * l - r) * t; p[i + 1] = g + (cg * l - g) * t; p[i + 2] = b + (cb * l - b) * t;
          }
          x.putImageData(d, 0, 0);
        } catch (e) { return im; }
        return (A.cache[col] = c);
      };
      return A;
    };
  }
})();
