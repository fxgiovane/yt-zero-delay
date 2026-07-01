(function () {
  var settings = { enabled: true, profile: "aggressive", customLatency: 1.5, debug: false };
  var video = null;
  var moviePlayer = null;
  var currentUrl = "";
  var lastRecoveryTime = 0;
  var recoveryAttempts = 0;
  var lastSeekTime = 0;
  var lastRateChangeTime = 0;
  var currentRate = 1.0;
  var seekAttempt = 0;
  var bridgeData = { latency: -1, playbackRate: 1.0, isLive: false, isAtLiveHead: false };

  var bridgeScript = document.createElement("script");
  bridgeScript.src = chrome.runtime.getURL("bridge.js");
  (document.head || document.documentElement).appendChild(bridgeScript);
  bridgeScript.onload = function () { bridgeScript.remove(); };

  document.addEventListener("DelayBridgeData", function (e) { bridgeData = e.detail; });

  var SEEK_COOLDOWN = 15000;
  var RATE_COOLDOWN = 8000;
  var meta = { title: "", channel: "", avatar: "", viewers: "", lastRefresh: 0 };

  var C = {
    "brasil":["Brasil","br"],"brazil":["Brasil","br"],
    "argentina":["Argentina","ar"],
    "uruguai":["Uruguai","uy"],"uruguay":["Uruguai","uy"],
    "col\u00f4mbia":["Col\u00f4mbia","co"],"colombia":["Col\u00f4mbia","co"],
    "estados unidos":["EUA","us"],"usa":["EUA","us"],"united states":["USA","us"],
    "m\u00e9xico":["M\u00e9xico","mx"],"mexico":["M\u00e9xico","mx"],
    "canad\u00e1":["Canad\u00e1","ca"],"canada":["Canada","ca"],
    "chile":["Chile","cl"],
    "equador":["Equador","ec"],"ecuador":["Ecuador","ec"],
    "paraguai":["Paraguai","py"],"paraguay":["Paraguay","py"],
    "peru":["Peru","pe"],
    "venezuela":["Venezuela","ve"],
    "fran\u00e7a":["Fran\u00e7a","fr"],"france":["France","fr"],
    "su\u00e9cia":["Su\u00e9cia","se"],"sweden":["Sweden","se"],
    "alemanha":["Alemanha","de"],"germany":["Germany","de"],
    "espanha":["Espanha","es"],"spain":["Spain","es"],
    "it\u00e1lia":["It\u00e1lia","it"],"italy":["Italy","it"],
    "inglaterra":["Inglaterra","gb"],"england":["England","gb"],
    "portugal":["Portugal","pt"],
    "su\u00ed\u00e7a":["Su\u00ed\u00e7a","ch"],"switzerland":["Switzerland","ch"],
    "holanda":["Holanda","nl"],"netherlands":["Netherlands","nl"],
    "b\u00e9lgica":["B\u00e9lgica","be"],"belgium":["Belgium","be"],
    "cro\u00e1cia":["Cro\u00e1cia","hr"],"croatia":["Croatia","hr"],
    "dinamarca":["Dinamarca","dk"],"denmark":["Denmark","dk"],
    "ucr\u00e2nia":["Ucr\u00e2nia","ua"],"ukraine":["Ukraine","ua"],
    "pol\u00f4nia":["Pol\u00f4nia","pl"],"poland":["Poland","pl"],
    "turquia":["Turquia","tr"],"turkey":["Turkey","tr"],
    "\u00e1ustria":["\u00c1ustria","at"],"austria":["Austria","at"],
    "jap\u00e3o":["Jap\u00e3o","jp"],"japan":["Japan","jp"],
    "coreia do sul":["Coreia do Sul","kr"],"south korea":["South Korea","kr"],
    "marrocos":["Marrocos","ma"],"morocco":["Morocco","ma"],
    "austr\u00e1lia":["Austr\u00e1lia","au"],"australia":["Australia","au"],
    "senegal":["Senegal","sn"],
    "camar\u00f5es":["Camar\u00f5es","cm"],"cameroon":["Cameroon","cm"],
    "gana":["Gana","gh"],"ghana":["Ghana","gh"],
    "ar\u00e1bia saudita":["Ar\u00e1bia Saudita","sa"],"saudi arabia":["Saudi Arabia","sa"]
  };

  var p1 = {
    "f1":"\uD83C\uDFCE\uFE0F","formula 1":"\uD83C\uDFCE\uFE0F","f\u00f3rmula 1":"\uD83C\uDFCE\uFE0F",
    "motogp":"\uD83C\uDFCE\uFE0F","le mans":"\uD83C\uDFCE\uFE0F","nascar":"\uD83C\uDFCE\uFE0F",
    "indycar":"\uD83C\uDFCE\uFE0F","indy":"\uD83C\uDFCE\uFE0F","stock car":"\uD83C\uDFCE\uFE0F",
    "automobilismo":"\uD83C\uDFCE\uFE0F","superbike":"\uD83C\uDFCE\uFE0F","spa 24h":"\uD83C\uDFCE\uFE0F",
    "24h de spa":"\uD83C\uDFCE\uFE0F","gptv":"\uD83C\uDFCE\uFE0F",
    "spacex":"\uD83D\uDE80","falcon 9":"\uD83D\uDE80","starship":"\uD83D\uDE80",
    "liftoff":"\uD83D\uDE80","rocket launch":"\uD83D\uDE80",
    "ufc":"\uD83E\uDD4A","bellator":"\uD83E\uDD4A",
    "libertadores":"\u26BD","brasileir\u00e3o":"\u26BD","champions league":"\u26BD",
    "nba":"\uD83C\uDFC0",
    "wimbledon":"\uD83C\uDFBE","roland garros":"\uD83C\uDFBE"
  };

  var p2 = {
    "corrida":"\uD83C\uDFCE\uFE0F","grand prix":"\uD83C\uDFCE\uFE0F","kart":"\uD83C\uDFCE\uFE0F",
    "foguete":"\uD83D\uDE80","rocket":"\uD83D\uDE80","spaceflight":"\uD83D\uDE80",
    "luta":"\uD83E\uDD4A","boxe":"\uD83E\uDD4A","boxing":"\uD83E\uDD4A","mma":"\uD83E\uDD4A",
    "futebol":"\u26BD","football":"\u26BD","soccer":"\u26BD",
    "basquete":"\uD83C\uDFC0","basketball":"\uD83C\uDFC0",
    "v\u00f4lei":"\uD83C\uDFD0","volei":"\uD83C\uDFD0","volleyball":"\uD83C\uDFD0",
    "t\u00eanis":"\uD83C\uDFBE","tenis":"\uD83C\uDFBE","tennis":"\uD83C\uDFBE"
  };

  var p3 = {
    "copa":"\u26BD","fifa":"\u26BD","uefa":"\u26BD",
    "fight":"\uD83E\uDD4A","combate":"\uD83E\uDD4A"
  };

  function log() {
    if (!settings.debug) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[SemAtraso]");
    console.log.apply(console, args);
  }

  function detect(title) {
    if (!title) return { country1: "", country2: "", code1: "", code2: "", sport: "" };
    var low = title.toLowerCase();
    var m = low.match(/(?:^|\s)([\w\u00e0-\u00fc\-]+)\s*(?:x|vs\.?|versus)\s*([\w\u00e0-\u00fc\-]+)(?:\s|$)/i);
    if (m) {
      var d1 = C[m[1].trim()];
      var d2 = C[m[2].trim()];
      if (d1 && d2) return { country1: d1[0], country2: d2[0], code1: d1[1], code2: d2[1], sport: "\u26BD" };
    }
    for (var k1 in p1) {
      if (low.includes(k1)) return { country1: "", country2: "", code1: "", code2: "", sport: p1[k1] };
    }
    for (var k2 in p2) {
      if (low.includes(k2)) return { country1: "", country2: "", code1: "", code2: "", sport: p2[k2] };
    }
    for (var k3 in p3) {
      if (low.includes(k3)) return { country1: "", country2: "", code1: "", code2: "", sport: p3[k3] };
    }
    return { country1: "", country2: "", code1: "", code2: "", sport: "" };
  }

  chrome.storage.local.get(["enabled", "profile", "customLatency", "debug"], function (r) {
    if (r.enabled !== undefined) settings.enabled = r.enabled;
    if (r.profile !== undefined) settings.profile = r.profile;
    if (r.customLatency !== undefined) settings.customLatency = r.customLatency;
    if (r.debug !== undefined) settings.debug = r.debug;
  });

  function target() {
    switch (settings.profile) {
      case "ultra": return 0.8;
      case "aggressive": return 1.5;
      case "conservative": return 3.0;
      case "custom": return settings.customLatency;
      default: return 1.5;
    }
  }

  function onVideoWaiting() {
    if (!video) return;
    if (video.playbackRate !== 1.0) video.playbackRate = 1.0;
    currentRate = 1.0;
    lastRateChangeTime = Date.now() + 12000;
    log("Waiting event. Cooldown 12s.");
  }

  function grabPlayer() {
    if (location.href === currentUrl && video && document.contains(video)) return;
    currentUrl = location.href;
    var newVideo = document.querySelector("video.html5-main-video");
    if (newVideo && newVideo !== video) {
      try { video.removeEventListener("waiting", onVideoWaiting); } catch (e) {}
      video = newVideo;
      video.addEventListener("waiting", onVideoWaiting);
    } else if (!newVideo) {
      video = null;
    }
    moviePlayer = document.getElementById("movie_player");
  }

  function grabMeta() {
    if (isAd()) return;
    var now = Date.now();
    if (now - meta.lastRefresh < 3000) return;
    meta.lastRefresh = now;

    var t = document.querySelector("ytd-watch-metadata #title h1 yt-formatted-string, ytd-watch-metadata #title h1, .ytp-title-link");
    meta.title = t ? t.textContent.trim() : "";

    var c = document.querySelector("#owner ytd-channel-name yt-formatted-string a, ytd-video-owner-renderer ytd-channel-name a");
    meta.channel = c ? c.textContent.trim() : "";

    var a = document.querySelector("#owner yt-img-shadow#avatar img, ytd-video-owner-renderer yt-img-shadow img");
    meta.avatar = a ? a.src : "";

    meta.viewers = "";

    var viewCount = document.querySelector("#view-count[aria-label]");
    if (viewCount) {
      var ariaLabel = viewCount.getAttribute("aria-label") || "";
      var vm = ariaLabel.match(/([\d.,]+)\s*(?:assistindo|watching)/i);
      if (vm) meta.viewers = vm[1];
    }

    if (!meta.viewers) {
      var vcSpan = document.querySelector("ytd-video-view-count-renderer .view-count");
      if (vcSpan) {
        var vm2 = (vcSpan.textContent || "").match(/([\d.,]+)\s*(?:assistindo|watching)/i);
        if (vm2) meta.viewers = vm2[1];
      }
    }

    if (!meta.viewers) {
      var spans = document.querySelectorAll("ytd-watch-metadata #info span, #info-strings yt-formatted-string");
      for (var i = 0; i < spans.length; i++) {
        var vm3 = (spans[i].textContent || "").match(/([\d.,]+)\s*(?:assistindo|watching)/i);
        if (vm3) { meta.viewers = vm3[1]; break; }
      }
    }
  }

  function isLive() {
    if (moviePlayer && moviePlayer.classList.contains("ytp-live")) return true;
    if (bridgeData && bridgeData.isLive) return true;
    var badge = document.querySelector(".ytp-live-badge");
    return !!(badge && badge.offsetWidth > 0 && badge.offsetHeight > 0);
  }

  function isAd() {
    if (!moviePlayer) return false;
    return moviePlayer.classList.contains("ad-showing") || moviePlayer.classList.contains("ad-interrupting");
  }

  function checkError() {
    var el = document.querySelector(".ytp-error");
    if (el && el.offsetHeight > 0) {
      var now = Date.now();
      if (now - lastRecoveryTime > 12000) {
        lastRecoveryTime = now;
        var stored = parseInt(sessionStorage.getItem("sa_recovery") || "0", 10);
        if (moviePlayer && typeof moviePlayer.reloadVideo === "function" && stored < 3) {
          moviePlayer.reloadVideo();
          sessionStorage.setItem("sa_recovery", String(stored + 1));
        } else if (stored < 5) {
          sessionStorage.setItem("sa_recovery", String(stored + 1));
          location.reload();
        }
      }
    } else {
      sessionStorage.removeItem("sa_recovery");
    }
  }

  function isAtLiveHead() {
    return !!document.querySelector(".ytp-live-badge-is-livehead") || (bridgeData && bridgeData.isAtLiveHead);
  }

  function getLatency() {
    if (isAtLiveHead()) return 0;
    var bar = document.querySelector(".ytp-progress-bar");
    if (bar) {
      var max = parseFloat(bar.getAttribute("aria-valuemax")) || 0;
      var now = parseFloat(bar.getAttribute("aria-valuenow")) || 0;
      return Math.max(0, max - now);
    }
    return 0;
  }

  function getBufferHealth() {
    if (!video || !video.buffered || video.buffered.length === 0) return 0;
    var cur = video.currentTime;
    try {
      for (var i = 0; i < video.buffered.length; i++) {
        if (cur >= video.buffered.start(i) && cur <= video.buffered.end(i)) {
          return Math.min(30, video.buffered.end(i) - cur);
        }
      }
    } catch (e) {}
    return 0;
  }

  function isSeeking() {
    return Date.now() - lastSeekTime < (seekAttempt > 3 ? 45000 : SEEK_COOLDOWN);
  }

  function getStatus() {
    grabPlayer();
    grabMeta();
    if (!video || !isLive()) return null;

    var drift = getLatency();
    var d = detect(meta.title);
    var errEl = document.querySelector(".ytp-error");
    var atHead = isAtLiveHead();
    var cdnLat = bridgeData && bridgeData.latency > 0 ? bridgeData.latency : 0;
    var buf = getBufferHealth();

    return {
      title: meta.title || "Live do YouTube",
      channel: meta.channel || "",
      avatar: meta.avatar,
      viewers: meta.viewers,
      latency: cdnLat > 0 ? cdnLat.toFixed(2) : (drift >= 0 ? drift.toFixed(2) : "0.00"),
      cdnLatency: cdnLat,
      bufferHealth: buf,
      playbackRate: video.playbackRate,
      paused: video.paused,
      enabled: settings.enabled,
      profile: settings.profile,
      customLatency: settings.customLatency,
      isAd: isAd(),
      hasError: !!(errEl && errEl.offsetHeight > 0),
      seeking: isSeeking() && !atHead,
      buffering: video.readyState < 3,
      atLiveHead: atHead,
      country1: d.country1,
      country2: d.country2,
      code1: d.code1,
      code2: d.code2,
      sport: d.sport
    };
  }

  function doSeek() {
    if (!video || !video.seekable || video.seekable.length === 0) {
      log("Seek abortado: sem video/buffer.");
      return;
    }
    var end = video.seekable.end(video.seekable.length - 1);
    var tgt = target();

    lastSeekTime = Date.now();
    lastRateChangeTime = Date.now();
    seekAttempt++;

    log("Seek #" + seekAttempt + " | End: " + end.toFixed(2) + " | Pos: " + video.currentTime.toFixed(2));

    var method = seekAttempt % 3;
    if (method === 1) {
      var badge = document.querySelector(".ytp-live-badge");
      if (badge) { badge.click(); }
      else { document.dispatchEvent(new CustomEvent("DelayBridgeSeek")); }
    } else if (method === 2) {
      document.dispatchEvent(new CustomEvent("DelayBridgeSeek"));
    } else {
      video.currentTime = end - tgt;
    }

    video.playbackRate = 1.0;
    currentRate = 1.0;
  }

  function isWatchOrLivePage() {
    return location.pathname.startsWith("/watch") || location.pathname.startsWith("/live");
  }

  function tick() {
    if (!settings.enabled) return;
    if (!isWatchOrLivePage()) return;

    grabPlayer();
    checkError();
    if (!video || video.paused || !isLive()) return;
    if (isAd()) { if (video.playbackRate !== 1.0) video.playbackRate = 1.0; return; }
    if (video.readyState < 3) { if (video.playbackRate !== 1.0) video.playbackRate = 1.0; return; }
    if (isSeeking()) { if (video.playbackRate !== 1.0) video.playbackRate = 1.0; return; }

    var scrubberDrift = 0;
    var bar = document.querySelector(".ytp-progress-bar");
    if (bar) {
      var max = parseFloat(bar.getAttribute("aria-valuemax")) || 0;
      var now = parseFloat(bar.getAttribute("aria-valuenow")) || 0;
      scrubberDrift = Math.max(0, max - now);
    }

    if (scrubberDrift > 6.0 && !isAtLiveHead()) {
      log("Drift critico: " + scrubberDrift.toFixed(1) + "s. Seek.");
      doSeek();
      return;
    }

    if (scrubberDrift <= 3.0) { seekAttempt = 0; recoveryAttempts = 0; }

    var ts = Date.now();
    if (ts - lastRateChangeTime < RATE_COOLDOWN) return;

    var cdnLat = bridgeData && bridgeData.latency > 0 ? bridgeData.latency : 0;
    var tgt = target();
    var buf = getBufferHealth();
    var lat = cdnLat > 0 ? cdnLat : (scrubberDrift > 2 ? scrubberDrift : 0);

    var minBuf = tgt < 1.5 ? tgt * 0.5 : 1.5;
    if (buf < minBuf || lat <= tgt) {
      if (currentRate !== 1.0) {
        log("Norm 1.0x | Buf:" + buf.toFixed(1) + "s Lat:" + lat.toFixed(1) + "s");
        video.playbackRate = 1.0;
        currentRate = 1.0;
        lastRateChangeTime = ts;
      }
      return;
    }

    var rate = 1.0;
    var critical = lat > tgt + 5.0;

    switch (settings.profile) {
      case "ultra": rate = critical ? 1.15 : 1.10; break;
      case "aggressive": rate = critical ? 1.10 : 1.06; break;
      case "conservative": rate = critical ? 1.05 : 1.02; break;
      case "custom": rate = critical ? 1.10 : 1.06; break;
      default: rate = 1.03;
    }

    if (currentRate !== rate) {
      log(rate + "x | CDN:" + lat.toFixed(1) + "s Buf:" + buf.toFixed(1) + "s Tgt:" + tgt + "s");
      video.playbackRate = rate;
      currentRate = rate;
      lastRateChangeTime = ts;
    }
  }

  setInterval(tick, 1000);

  window.addEventListener("yt-navigate-finish", function () {
    if (video) { try { video.playbackRate = 1.0; } catch (e) {} }
    currentUrl = "";
    recoveryAttempts = 0;
    seekAttempt = 0;
    meta.lastRefresh = 0;
    lastSeekTime = 0;
    lastRateChangeTime = 0;
    currentRate = 1.0;
    bridgeData = { latency: -1, playbackRate: 1.0, isLive: false, isAtLiveHead: false };
    grabPlayer();
  });

  chrome.runtime.onMessage.addListener(function (req, sender, respond) {
    if (req.action === "getStatus") {
      respond(getStatus());
    } else if (req.action === "updateSettings") {
      settings = Object.assign({}, settings, req.settings);
      chrome.storage.local.set(settings);
      if (!settings.enabled && video) {
        try { video.playbackRate = 1.0; currentRate = 1.0; } catch (e) {}
      }
      respond({ success: true });
    }
    return true;
  });
})();
