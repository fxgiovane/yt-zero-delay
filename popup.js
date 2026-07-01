document.addEventListener("DOMContentLoaded", function () {
  var tog = document.getElementById("tog");
  var lat = document.getElementById("lat");
  var sync = document.getElementById("sync");
  var stxt = document.getElementById("stxt");
  var dot = document.getElementById("dot");
  var spd = document.getElementById("spd");
  var liveC = document.getElementById("liveC");
  var noC = document.getElementById("noC");
  var mq = document.getElementById("mq");
  var mqt = document.getElementById("mqt");
  var ch = document.getElementById("ch");
  var av = document.getElementById("av");
  var vw = document.getElementById("vw");
  var matchBox = document.getElementById("matchBox");
  var fl1 = document.getElementById("fl1");
  var mN1 = document.getElementById("mN1");
  var fl2 = document.getElementById("fl2");
  var mN2 = document.getElementById("mN2");
  var sportBox = document.getElementById("sportBox");
  var sIcon = document.getElementById("sIcon");
  var custR = document.getElementById("custR");
  var custV = document.getElementById("custV");
  var custArea = document.getElementById("custArea");
  var profs = document.querySelectorAll(".pb");
  var dbgBtn = document.getElementById("dbgBtn");

  var L = {
    pt: {
      title: "Sem Atraso", delayLabel: "Atraso da Transmiss\u00e3o",
      synced: "Sincronizado", adjusting: "Ajustando lat\u00eancia...", disabled: "Desativado",
      error: "Erro no player", noStream: "Sem live", seeking: "Sincronizando atraso...",
      reducing: "Reduzindo delay...",
      liveLabel: "Live Detectada", loading: "Carregando...",
      profileLabel: "Perfil", custom: "Personalizado",
      noLive: "Nenhuma live nesta aba.<br>Abra uma transmiss\u00e3o no YouTube.",
      ultra: "Ultra", aggressive: "Agressivo", safe: "Seguro", watching: "assistindo",
      ad: "An\u00fancio comercial..."
    },
    en: {
      title: "No Delay", delayLabel: "Live Delay",
      synced: "Synced", adjusting: "Adjusting latency...", disabled: "Disabled",
      error: "Player error", noStream: "No live", seeking: "Synchronizing delay...",
      reducing: "Reducing delay...",
      liveLabel: "Live Detected", loading: "Loading...",
      profileLabel: "Profile", custom: "Custom",
      noLive: "No live stream in this tab.<br>Open a YouTube live.",
      ultra: "Ultra", aggressive: "Aggressive", safe: "Safe", watching: "watching",
      ad: "Commercial ad..."
    }
  };

  var lang = navigator.language.startsWith("pt") ? "pt" : "en";
  var t = L[lang];

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var k = el.getAttribute("data-i18n");
    if (t[k]) el.innerHTML = t[k];
  });

  var profile = "aggressive";
  var enabled = true;
  var customLat = 1.5;
  var debugMode = false;
  var lastTitle = "";

  var tgtMap = { ultra: 0.8, aggressive: 1.5, conservative: 3.0 };

  function send() {
    var s = { enabled: enabled, profile: profile, customLatency: customLat, debug: debugMode };
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes("youtube.com")) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "updateSettings", settings: s }, function () {
          if (chrome.runtime.lastError) {}
        });
      }
    });
    chrome.storage.local.set(s);
  }

  function syncBtns() {
    profs.forEach(function (b) { b.classList.toggle("on", b.dataset.p === profile); });
    if (profile === "custom") {
      custArea.style.opacity = "1";
      custR.value = customLat;
      custV.textContent = customLat.toFixed(1) + "s";
    } else {
      custArea.style.opacity = "0.35";
      var v = tgtMap[profile] || 1.5;
      custR.value = v;
      custV.textContent = v.toFixed(1) + "s";
    }
  }

  function noLive() {
    document.body.classList.toggle("off", !enabled);
    liveC.style.display = "none";
    noC.style.display = "block";
    lat.textContent = "--";
    lat.className = "lat-big";
    dot.style.display = "none";
    stxt.textContent = t.noStream;
    sync.className = "sync-line";
    spd.textContent = "--";
    spd.className = "spd";
    matchBox.style.display = "none";
    sportBox.style.display = "none";
  }

  function setMarquee(text) {
    if (text === lastTitle) return;
    lastTitle = text;
    mqt.textContent = text;
    mq.classList.remove("go");

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (mqt.scrollWidth > mq.offsetWidth) {
          var sep = "  \u00A0\u00A0\u2022\u00A0\u00A0  ";
          mqt.textContent = text + sep + text + sep;
          var dur = Math.max(18, text.length * 0.55);
          mq.style.setProperty("--dur", dur + "s");
          mq.classList.add("go");
        }
      });
    });
  }

  function render(d) {
    liveC.style.display = "block";
    noC.style.display = "none";

    setMarquee(d.title);
    ch.textContent = d.channel || "--";

    if (d.avatar && d.avatar.startsWith("http")) {
      av.src = d.avatar;
      av.classList.add("on");
    }

    if (d.viewers) {
      vw.textContent = d.viewers + " " + t.watching;
    } else {
      vw.textContent = "";
    }

    if (d.country1 && d.country2) {
      if (d.code1) {
        fl1.src = "https://flagcdn.com/w40/" + d.code1.toLowerCase() + ".png";
        fl1.onerror = function() { fl1.style.display = "none"; };
        fl1.style.display = "inline-block";
      } else { fl1.style.display = "none"; }
      mN1.textContent = d.country1;

      if (d.code2) {
        fl2.src = "https://flagcdn.com/w40/" + d.code2.toLowerCase() + ".png";
        fl2.onerror = function() { fl2.style.display = "none"; };
        fl2.style.display = "inline-block";
      } else { fl2.style.display = "none"; }
      mN2.textContent = d.country2;

      matchBox.style.display = "flex";
      sportBox.style.display = "none";
    } else if (d.sport) {
      sIcon.textContent = d.sport;
      sportBox.style.display = "flex";
      matchBox.style.display = "none";
      var isCorrida = d.sport === "\uD83C\uDFCE\uFE0F" || d.sport === "\uD83C\uDFCE" || d.sport === "🏎️";
      var isFoguete = d.sport === "\uD83D\uDE80" || d.sport === "🚀";
      var isFutebol = d.sport === "\u26BD" || d.sport === "⚽";
      var isPolitica = d.sport === "🦑" || d.sport === "🏛️";
      var isEspaco = d.sport === "🪐";
      var isCiencia = d.sport === "🔬";
      var isNoticia = d.sport === "📰";
      var isDesenho = d.sport === "🧸";
      var isJogos = d.sport === "🎮";
      var isMusica = d.sport === "🎶";
      var isBasquete = d.sport === "\uD83C\uDFC0";
      var isVolei = d.sport === "\uD83C\uDFD0";
      var isTenis = d.sport === "\uD83C\uDFBE";
      var isFutebolAmericano = d.sport === "\uD83C\uDFC8";
      var isBaseball = d.sport === "\u26BE";
      var isHockey = d.sport === "\uD83C\uDFD2";
      var isOlimpiadas = d.sport === "\uD83C\uDFFF";
      var isNatacao = d.sport === "\uD83C\uDFCA";
      var isAtletismo = d.sport === "\uD83C\uDFC3";
      var isCiclismo = d.sport === "\uD83D\uDEB4";
      var isSurfe = d.sport === "\uD83C\uDFC4";
      var isSkate = d.sport === "\uD83D\uDEF9";
      sportBox.classList.toggle("sport-corrida", isCorrida);
      sportBox.classList.toggle("sport-foguete", isFoguete);
      sportBox.classList.toggle("sport-futebol", isFutebol || isBasquete || isVolei || isTenis || isFutebolAmericano || isBaseball || isHockey || isOlimpiadas || isNatacao || isAtletismo || isCiclismo || isSurfe || isSkate);
      sportBox.classList.toggle("sport-politica", isPolitica);
      sportBox.classList.toggle("sport-espaco", isEspaco);
      sportBox.classList.toggle("sport-ciencia", isCiencia);
      sportBox.classList.toggle("sport-noticia", isNoticia);
      sportBox.classList.toggle("sport-desenho", isDesenho);
      sportBox.classList.toggle("sport-jogos", isJogos);
      sportBox.classList.toggle("sport-musica", isMusica);
    } else {
      matchBox.style.display = "none";
      sportBox.style.display = "none";
      sportBox.classList.remove("sport-corrida", "sport-foguete", "sport-futebol", "sport-politica", "sport-espaco", "sport-ciencia", "sport-noticia", "sport-desenho", "sport-jogos", "sport-musica");
    }

    var latVal = parseFloat(d.latency);
    if (d.profile && d.profile !== profile) {
      profile = d.profile;
      syncBtns();
    }
    var tgt = d.profile === "custom" ? d.customLatency : (tgtMap[d.profile] || 1.5);

    document.body.classList.toggle("off", !d.enabled);

    if (!d.enabled) {
      lat.textContent = "--";
      lat.className = "lat-big";
      dot.style.display = "none";
      stxt.textContent = t.disabled;
      sync.className = "sync-line";
      spd.textContent = "--";
      spd.className = "spd";
    } else if (d.isAd) {
      lat.textContent = "--";
      lat.className = "lat-big";
      dot.style.display = "none";
      stxt.textContent = t.ad;
      sync.className = "sync-line seek";
      spd.textContent = "--";
      spd.className = "spd";
    } else if (d.seeking) {
      lat.textContent = "\u23F3";
      lat.className = "lat-big seek";
      dot.style.display = "none";
      stxt.textContent = t.seeking;
      sync.className = "sync-line seek";
      spd.textContent = d.playbackRate.toFixed(2) + "x";
      spd.className = "spd";
    } else if (d.hasError) {
      lat.textContent = "\u26A0";
      lat.className = "lat-big";
      dot.style.display = "none";
      stxt.textContent = t.error;
      sync.className = "sync-line err";
      spd.textContent = "--";
      spd.className = "spd";
    } else if (d.buffering) {
      lat.textContent = latVal > 60 ? ">60s" : latVal.toFixed(1) + "s";
      lat.className = "lat-big adj";
      dot.style.display = "none";
      stxt.textContent = t.adjusting;
      sync.className = "sync-line adj";
      spd.textContent = d.playbackRate.toFixed(2) + "x";
      spd.className = "spd";
    } else if (d.playbackRate > 1.01) {
      lat.textContent = latVal > 60 ? ">60s" : latVal.toFixed(1) + "s";
      lat.className = "lat-big adj";
      dot.style.display = "none";
      stxt.textContent = t.reducing;
      sync.className = "sync-line adj";
      spd.textContent = d.playbackRate.toFixed(2) + "x \u25B2";
      spd.className = "spd fast";
    } else if (latVal <= tgt + 0.5 || (d.cdnFloor > 0 && latVal <= d.cdnFloor + 1.5 && d.playbackRate <= 1.01)) {
      lat.textContent = latVal.toFixed(1) + "s";
      lat.className = "lat-big ok";
      dot.style.display = "inline-block";
      stxt.textContent = t.synced;
      sync.className = "sync-line ok";
      spd.textContent = d.playbackRate.toFixed(2) + "x";
      spd.className = "spd";
    } else {
      lat.textContent = latVal > 60 ? ">60s" : latVal.toFixed(1) + "s";
      lat.className = "lat-big adj";
      dot.style.display = "none";
      stxt.textContent = t.adjusting;
      sync.className = "sync-line adj";
      spd.textContent = d.playbackRate.toFixed(2) + "x";
      spd.className = "spd";
    }
  }

  function poll() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes("youtube.com")) { noLive(); return; }
      chrome.tabs.sendMessage(tabs[0].id, { action: "getStatus" }, function (res) {
        if (chrome.runtime.lastError || !res) { noLive(); return; }
        render(res);
      });
    });
  }

  tog.addEventListener("change", function (e) {
    enabled = e.target.checked;
    document.body.classList.toggle("off", !enabled);
    send();
    poll();
  });

  profs.forEach(function (b) {
    b.addEventListener("click", function () {
      profile = b.dataset.p;
      syncBtns();
      send();
      poll();
    });
  });

  custR.addEventListener("input", function (e) {
    customLat = parseFloat(e.target.value);
    custV.textContent = customLat.toFixed(1) + "s";
    profile = "custom";
    syncBtns();
    send();
    poll();
  });

  dbgBtn.addEventListener("click", function () {
    debugMode = !debugMode;
    dbgBtn.classList.toggle("on", debugMode);
    send();
  });

  chrome.storage.local.get(["enabled", "profile", "customLatency", "debug"], function (r) {
    if (r.enabled !== undefined) enabled = r.enabled;
    if (r.profile !== undefined) profile = r.profile;
    if (r.customLatency !== undefined) customLat = r.customLatency;
    if (r.debug !== undefined) debugMode = r.debug;
    tog.checked = enabled;
    dbgBtn.classList.toggle("on", debugMode);
    custR.value = customLat;
    custV.textContent = customLat.toFixed(1) + "s";
    syncBtns();
    poll();
  });

  setInterval(poll, 800);
});
