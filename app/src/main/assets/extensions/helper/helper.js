// Page helper for MarkBook.
(() => {
  const port = browser.runtime.connectNative("markbook");
  const log = (text) => port.postMessage({ type: "log", text });

  // ---- Debug: describe elements, so cleanup rules can be written against the real page ----
  const describe = (el) => {
    const a = [el.tagName.toLowerCase()];
    for (const n of ["id", "class", "role", "aria-label", "data-type", "data-mcomponent", "data-action-id", "href", "data-sigil"]) {
      const v = el.getAttribute && el.getAttribute(n);
      if (v) a.push(n + "=" + JSON.stringify(v.slice(0, 60)));
    }
    const r = el.getBoundingClientRect();
    a.push("@" + Math.round(r.left) + "," + Math.round(r.top) + " " + Math.round(r.width) + "x" + Math.round(r.height));
    return a.join(" ");
  };
  function find(text) {
    const re = new RegExp(text, "i");
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    for (let el = walker.currentNode; el; el = walker.nextNode()) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
      const label = el.getAttribute("aria-label") || "";
      if ((own && re.test(own)) || (label && re.test(label))) hits.push(el);
      if (hits.length >= (window.__mbMax || 4)) break;
    }
    log("find '" + text + "': " + hits.length + " hits on " + location.href);
    hits.forEach((el, i) => {
      log("#" + i + " text=" + JSON.stringify((el.textContent || "").slice(0, 80)) + " label=" + JSON.stringify(el.getAttribute("aria-label")));
      const chain = [];
      for (let e = el; e && e !== document.body && chain.length < 12; e = e.parentElement) chain.push(describe(e));
      log("#" + i + "\n  " + chain.join("\n  "));
    });
  }
  function html(sel, max) {
    const el = document.querySelector(sel);
    log("html " + sel + ": " + (el ? el.outerHTML.slice(0, max || 3000) : "none"));
  }

  // ---- Messages: the mobile site only says "Get the Messenger app"; the app opens the inbox
  //      from the desktop site in its own tab instead ----
  if (location.hostname === "m.facebook.com") {
    // Facebook reacts to touch/pointer events too, so all of them are swallowed on that tab.
    let lastOpen = 0;
    const TAB = '[role=tab][aria-label^="messages" i], [role=tab][aria-label^="poruke" i], [role=tab][aria-label^="поруке" i]';
    for (const type of ["touchstart", "touchend", "pointerdown", "pointerup", "mousedown", "mouseup", "click"]) {
      document.addEventListener(type, (e) => {
        if (!(e.target.closest && e.target.closest(TAB))) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        // Blocking touchend also blocks the click, so the tap itself opens the inbox.
        if (type === "touchend" || type === "click") {
          const now = Date.now();
          if (now - lastOpen > 800) port.postMessage({ type: "openMessages" });
          lastOpen = now;
        }
      }, { capture: true, passive: false });
    }
  }

  // ---- Cleanup on the mobile site: sponsored posts and "use the app" prompts ----
  const AD_LABEL = /^(ad|sponsored|sponzorisano|спонзорисано|реклама|reklama|oglas)$/i;
  const APP_PROMO = /^(open app|get app|use app|get the app|open the app|get facebook for android.*|otvori aplikaciju|preuzmi aplikaciju|отвори апликацију)$/i;
  // Feed blocks that aren't posts from friends, pages or groups you follow.
  const SUGGESTED = /^(people you may know|suggested for you|suggested groups|reels|reels and short videos|suggested reels|osobe koje možda poznaješ|osobe koje mozda poznajes|predloženo za tebe|predlozeno za tebe|predložene grupe|особе које можда познајеш|предложено за тебе)$/i;
  // A "Follow" / "Join" button in a post's header means a suggested post from a page or group
  // you don't follow.
  const FOLLOW = /^(follow|join|zaprati|prati|pridruži se|придружи се|запрати|прати)$/i;
  // The feed is virtualised: Facebook measures each block and keeps blocks that are off screen
  // as empty placeholders of that height. Hidden blocks therefore stay in place but measure 0px
  // (a stylesheet !important rule beats the heights Facebook writes into style="").
  const hideStyle = document.createElement("style");
  // Facebook also watches which blocks are on screen to decide when to load more, so a hidden
  // block keeps its content (overflowing, transparent, untouchable, behind the next posts)
  // instead of being clipped away.
  hideStyle.textContent = "[data-mb-hidden]{height:1px!important;min-height:0!important;margin:0!important;"
    + "overflow:visible!important;opacity:0!important;pointer-events:none!important;"
    + "position:relative!important;z-index:-1!important}";
  (document.head || document.documentElement).appendChild(hideStyle);
  const hide = (el, why) => {
    if (!el || el.dataset.mbHidden) return;
    // The Reels viewer is a snapping pager: collapsing a page there shifts the pages after it
    // and the pager jumps back a reel. Sponsored reels are skipped instead (see skipReels).
    if (el.parentElement && el.parentElement.classList.contains("vscroller-snap")) {
      if (!el.dataset.mbSkip) { el.dataset.mbSkip = why; skipReels(el.parentElement); }
      return;
    }
    el.dataset.mbHidden = why;
    el.dataset.mbHeight = el.style.height;
    el.style.height = "1px";
  };
  // Reels viewer: when a swipe stops on a sponsored reel, go on to the next one (or the previous
  // one when swiping back). Its picture is made invisible; its size stays untouched.
  hideStyle.textContent += "[data-mb-skip]{opacity:0!important;pointer-events:none!important}";
  const pagers = new WeakSet();
  function skipReels(pager) {
    if (pagers.has(pager)) return;
    pagers.add(pager);
    let lastTop = pager.scrollTop, dir = 1, timer = 0;
    const settle = () => {
      const top = pager.scrollTop;
      if (top !== lastTop) dir = top > lastTop ? 1 : -1;
      lastTop = top;
      const r = pager.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      let unit = el;
      while (unit && unit.parentElement !== pager) unit = unit.parentElement;
      // elementFromPoint skips the invisible ad (pointer-events:none), so look by position too.
      for (const k of pager.children) {
        const kr = k.getBoundingClientRect();
        if (kr.top <= r.top + r.height / 2 && kr.bottom > r.top + r.height / 2) { unit = k; break; }
      }
      if (!unit || !unit.dataset.mbSkip) return;
      let next = dir > 0 ? unit.nextElementSibling : unit.previousElementSibling;
      while (next && next.dataset.mbSkip) next = dir > 0 ? next.nextElementSibling : next.previousElementSibling;
      if (!next) next = dir > 0 ? unit.previousElementSibling : unit.nextElementSibling;
      log("skip sponsored reel, dir " + dir);
      if (next) pager.scrollTo({ top: pager.scrollTop + next.getBoundingClientRect().top - r.top, behavior: "smooth" });
    };
    pager.addEventListener("scroll", () => {
      clearTimeout(timer);
      timer = setTimeout(settle, 180);
    }, { passive: true });
    setTimeout(settle, 300);
  }
  // A feed unit is the child of the page's vertical scroller.
  const feedUnit = (el) => {
    for (let e = el; e && e.parentElement; e = e.parentElement) {
      if (e.parentElement.getAttribute("data-type") === "vscroller") return e;
    }
    return null;
  };
  function check(span) {
    const t = span.textContent.trim();
    if (!t || t.length > 40) return;
    if (AD_LABEL.test(t)) {
      hide(feedUnit(span), "ad");
    } else if (SUGGESTED.test(t)) {
      hide(feedUnit(span), "suggested");
    } else if (FOLLOW.test(t)) {
      // Only a Follow/Join button in the first rows of a post (its header).
      const unit = feedUnit(span);
      if (unit && !unit.dataset.mbHidden && headerOf(unit, span)) hide(unit, "follow");
    } else if (APP_PROMO.test(t)) {
      hide(span.closest(".fixed-container") || span.closest("[role=button]"), "promo");
    }
  }
  // The header is the unit's first child block; the button sits inside it.
  const headerOf = (unit, el) => {
    const first = unit.firstElementChild;
    return !!first && first.contains(el);
  };
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.tagName === "SPAN") check(root);
    for (const span of root.querySelectorAll("span")) check(span);
  }
  if (location.hostname === "m.facebook.com") {
    // Runs right when Facebook inserts a post, before it measures the post's height; a post
    // hidden later would leave a hole in Facebook's scroll bookkeeping.
    new MutationObserver((list) => {
      try {
        for (const m of list) {
          if (m.type === "characterData") {
            if (m.target.parentElement) check(m.target.parentElement);
          } else {
            for (const n of m.addedNodes) scan(n);
          }
        }
      } catch (e) { }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    scan(document.body);
  }

  // ---- Inbox (desktop site): close the "turn on push notifications" prompt; MarkBook never
  //      shows notifications anyway ----
  if (location.hostname === "www.facebook.com") {
    const CLOSE = /^(затвори|zatvori|close|not now|ne sada|не сада)$/i;
    const closePrompts = () => {
      for (const d of document.querySelectorAll("[role=alertdialog][aria-label*=notification i], [role=dialog][aria-label*=notification i]")) {
        const b = [...d.querySelectorAll("[role=button], button, [aria-label]")].find((e) =>
          CLOSE.test((e.getAttribute("aria-label") || e.textContent || "").trim()));
        if (b) b.click();
        else d.remove();
      }
    };
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      setTimeout(() => { queued = false; try { closePrompts(); } catch (e) { } }, 200);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  // ---- Pull down at the top of the feed to refresh (the website has no pull-to-refresh) ----
  function setupPullToRefresh(isFeed) {
    const PULL = 110, MAX = 170;
    let startY = -1, startX = 0, pulling = false, dist = 0;
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:50%;top:0;z-index:2147483647;width:44px;height:44px;margin-left:-22px;"
      + "border-radius:22px;background:#2b2f36;box-shadow:0 2px 8px rgba(0,0,0,.45);display:none;"
      + "align-items:center;justify-content:center;color:#fff;font:600 22px sans-serif;pointer-events:none;"
      + "transition:opacity .15s;";
    box.textContent = "↻";
    const attach = () => { if (!box.isConnected) (document.body || document.documentElement).appendChild(box); };
    const show = (d) => {
      attach();
      box.style.display = "flex";
      const p = Math.min(d / PULL, 1);
      box.style.transform = "translateY(" + Math.round(Math.min(d, MAX) * 0.6) + "px) rotate(" + Math.round(p * 300) + "deg)";
      box.style.opacity = String(0.35 + p * 0.65);
      box.style.background = p >= 1 ? "#4f8cff" : "#2b2f36";
    };
    const hideBox = () => { box.style.display = "none"; };
    // Something scrolled inside the page (a comment sheet, a carousel) takes priority.
    const innerScrolled = (el) => {
      for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
        if (e.scrollTop > 0) return true;
        if (e.getAttribute && (e.getAttribute("role") === "dialog")) return true;
      }
      return false;
    };
    document.addEventListener("touchstart", (e) => {
      pulling = false; dist = 0; startY = -1;
      if (e.touches.length !== 1 || !isFeed() || window.scrollY > 0 || innerScrolled(e.target)) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    }, { passive: true, capture: true });
    document.addEventListener("touchmove", (e) => {
      if (startY < 0) return;
      const dy = e.touches[0].clientY - startY, dx = Math.abs(e.touches[0].clientX - startX);
      if (!pulling) {
        if (window.scrollY > 0 || dx > Math.abs(dy) || dy < -5) { startY = -1; return; }
        if (dy < 15) return;
        pulling = true;
      }
      dist = Math.max(0, dy - 15);
      show(dist);
    }, { passive: true, capture: true });
    const end = () => {
      if (pulling && dist >= PULL) {
        box.style.transition = "none";
        box.style.background = "#4f8cff";
        box.animate([{ transform: box.style.transform }, { transform: box.style.transform + " rotate(720deg)" }],
          { duration: 900, iterations: Infinity });
        location.reload();
      } else {
        hideBox();
      }
      startY = -1; pulling = false; dist = 0;
    };
    document.addEventListener("touchend", end, { passive: true, capture: true });
    document.addEventListener("touchcancel", () => { hideBox(); startY = -1; pulling = false; }, { passive: true, capture: true });
  }

  if (location.hostname === "m.facebook.com") setupPullToRefresh(() => /^\/(home\.php)?$/.test(location.pathname));

  port.onMessage.addListener((msg) => {
    try {
      if (msg.type === "find") find(msg.text);
      else if (msg.type === "html") html(msg.sel, msg.max);
      else if (msg.type === "hidden") log("hidden: " + [...document.querySelectorAll("[data-mb-hidden]")].map((e) => e.dataset.mbHidden).join(","));
      else if (msg.type === "info") {
        const r = document.getElementById("screen-root");
        const cs = r && getComputedStyle(r);
        log("info url=" + location.href + " text=" + document.body.innerText.length + " scrollY=" + scrollY
          + " root=" + (r ? cs.display + "/" + cs.visibility + "/" + cs.opacity + " " + JSON.stringify(r.getBoundingClientRect()) : "none")
          + " bodybg=" + getComputedStyle(document.body).backgroundColor + " vis=" + document.visibilityState
          + " first=" + JSON.stringify(document.body.innerText.slice(0, 200)));
      }
      else if (msg.type === "units") {
        const sc = document.querySelector("[data-type=vscroller]");
        const kids = sc ? [...sc.children] : [];
        const cs = sc && getComputedStyle(sc);
        log("scroller " + (sc ? cs.position + " h=" + sc.style.height + " " + JSON.stringify(sc.getBoundingClientRect()) : "none") + " kids=" + kids.length + " docH=" + document.documentElement.scrollHeight + " y=" + scrollY);
        kids.slice(0, 40).forEach((k, i) => {
          const c = getComputedStyle(k);
          log(i + " " + c.position + " top=" + c.top + " tr=" + c.transform + " h=" + Math.round(k.getBoundingClientRect().height) + " style=" + (k.getAttribute("style") || "").slice(0, 80) + " hid=" + (k.dataset.mbHidden || "") + " cls=" + k.className);
        });
      }
      else if (msg.type === "chatBack") {
        // Browser history inside the inbox ends on an empty "No chats selected" page; the
        // chat's own back arrow returns to the list.
        const BACK = /^(назад|nazad|back)$/i;
        const b = [...document.querySelectorAll("[role=button][aria-label], [aria-label][tabindex]")].find((e) => {
          const r = e.getBoundingClientRect();
          return BACK.test(e.getAttribute("aria-label").trim()) && r.width > 0 && r.top >= 0 && r.top < 250;
        });
        const inChat = /\/messages\/(e2ee\/)?t\//.test(location.pathname);
        if (inChat && b) b.click();
        port.postMessage({ type: "backResult", handled: !!(inChat && b) });
      }
      else if (msg.type === "reload") location.href = msg.url || location.href;
      else if (msg.type === "buttons") {
        for (const b of document.querySelectorAll("[role=button][aria-label], a[aria-label], button[aria-label]")) {
          const r = b.getBoundingClientRect();
          if (r.width > 0 && r.top < 300) log("btn " + JSON.stringify(b.getAttribute("aria-label")) + " @" + Math.round(r.left) + "," + Math.round(r.top) + " " + Math.round(r.width) + "x" + Math.round(r.height));
        }
      }
      else if (msg.type === "dump") log("dump " + location.href + " " + document.title);
    } catch (e) {
      log("error " + e);
    }
  });
  log("helper on " + location.href);
})();
