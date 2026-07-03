(function () {
  var myInstanceId = Math.random();
  window.__semAtrasoActiveInstance = myInstanceId;

  function isContextValid() {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); }
    catch(e) { return false; }
  }

  var settings = { enabled: true, profile: "aggressive", customLatency: 1.5, debug: false };
  var video = null;
  var moviePlayer = null;
  var currentUrl = "";
  var lastRecoveryTime = 0;
  var recoveryAttempts = 0;
  var lastSeekTime = 0;
  var currentRate = 1.0;
  var seekAttempt = 0;
  var bridgeData = { latency: -1, playbackRate: 1.0, isLive: false, isAtLiveHead: false, bufferHealth: -1, playerRate: -1, statsAvailable: false };
  var bufferEma = null;
  var lastBufHealth = null;
  var drainEma = 0;
  var catchingUp = false;
  var appliedRate = 1.0;
  var yieldedToUser = false;
  var stallTimes = [];
  var lastStall = 0;
  var stallCooldownUntil = 0;
  var cdnFloor = 0;

  var bridgeScript = document.createElement("script");
  bridgeScript.src = chrome.runtime.getURL("bridge.js");
  (document.head || document.documentElement).appendChild(bridgeScript);
  bridgeScript.onload = function () { bridgeScript.remove(); };

  document.addEventListener("DelayBridgeData", function (e) { bridgeData = e.detail; });

  var SEEK_COOLDOWN = 15000;
  var CATCH_UP_BAND = 0.5;
  var DRAIN_BRAKE = -0.5;
  var BUFFER_FLOOR = 0.5;
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
    "bol\u00edvia":["Bol\u00edvia","bo"],"bolivia":["Bolivia","bo"],
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
    "ar\u00e1bia saudita":["Ar\u00e1bia Saudita","sa"],"saudi arabia":["Saudi Arabia","sa"],
    "s\u00e9rvia":["S\u00e9rvia","rs"],"serbia":["Serbia","rs"],
    "r\u00fassia":["R\u00fassia","ru"],"russia":["Russia","ru"],
    "china":["China","cn"],
    "\u00edndia":["\u00cdndia","in"],"india":["India","in"],
    "irlanda":["Irlanda","ie"],"ireland":["Ireland","ie"],
    "esc\u00f3cia":["Esc\u00f3cia","gb-sct"],"scotland":["Scotland","gb-sct"],
    "pa\u00eds de gales":["Pa\u00eds de Gales","gb-wls"],"wales":["Wales","gb-wls"],
    "costa rica":["Costa Rica","cr"],
    "panam\u00e1":["Panam\u00e1","pa"],"panama":["Panama","pa"],
    "nig\u00e9ria":["Nig\u00e9ria","ng"],"nigeria":["Nigeria","ng"],
    "eg\u00edto":["Eg\u00edto","eg"],"egypt":["Egypt","eg"],
    "tun\u00edsia":["Tun\u00edsia","tn"],"tunisia":["Tunisia","tn"],
    "arg\u00e9lia":["Arg\u00e9lia","dz"],"algeria":["Algeria","dz"],
    "gr\u00e9cia":["Gr\u00e9cia","gr"],"greece":["Greece","gr"],
    "rom\u00eania":["Rom\u00eania","ro"],"romania":["Romania","ro"],
    "hungria":["Hungria","hu"],"hungary":["Hungary","hu"],
    "rep\u00fablica tcheca":["Rep. Tcheca","cz"],"czech republic":["Czech Republic","cz"],
    "noruega":["Noruega","no"],"norway":["Norway","no"],
    "finl\u00e2ndia":["Finl\u00e2ndia","fi"],"finland":["Finland","fi"],
    "isl\u00e2ndia":["Isl\u00e2ndia","is"],"iceland":["Iceland","is"],
    "coreia do norte":["Coreia do Norte","kp"],"north korea":["North Korea","kp"],
    "ir\u00e3":["Ir\u00e3","ir"],"iran":["Iran","ir"],
    "iraque":["Iraque","iq"],"iraq":["Iraq","iq"],
    "israel":["Israel","il"],
    "qatar":["Qatar","qa"],
    "emirados":["Emirados","ae"],"uae":["UAE","ae"],
    "nova zel\u00e2ndia":["Nova Zel\u00e2ndia","nz"],"new zealand":["New Zealand","nz"]
  };

  var C_clean = {};
  function cleanCountryName(str) {
    if (!str) return "";
    return str.toLowerCase()
      .replace(/[áàâãä]/g, "a")
      .replace(/[éèêë]/g, "e")
      .replace(/[íìîï]/g, "i")
      .replace(/[óòôõö]/g, "o")
      .replace(/[úùûü]/g, "u")
      .replace(/ç/g, "c")
      .replace(/ñ/g, "n")
      .trim();
  }
  for (var k in C) {
    var cleanKey = cleanCountryName(k);
    if (!C_clean[cleanKey] || k !== cleanKey) {
      C_clean[cleanKey] = C[k];
    }
  }

  var p1 = {
    "f1":"\uD83C\uDFCE\uFE0F","formula 1":"\uD83C\uDFCE\uFE0F","f\u00f3rmula 1":"\uD83C\uDFCE\uFE0F",
    "formula 2":"\uD83C\uDFCE\uFE0F","formula 3":"\uD83C\uDFCE\uFE0F","f\u00f3rmula 2":"\uD83C\uDFCE\uFE0F",
    "motogp":"\uD83C\uDFCE\uFE0F","moto gp":"\uD83C\uDFCE\uFE0F","moto2":"\uD83C\uDFCE\uFE0F","moto3":"\uD83C\uDFCE\uFE0F",
    "le mans":"\uD83C\uDFCE\uFE0F","nascar":"\uD83C\uDFCE\uFE0F",
    "indycar":"\uD83C\uDFCE\uFE0F","indy 500":"\uD83C\uDFCE\uFE0F","indy":"\uD83C\uDFCE\uFE0F",
    "stock car":"\uD83C\uDFCE\uFE0F","formula e":"\uD83C\uDFCE\uFE0F","f\u00f3rmula e":"\uD83C\uDFCE\uFE0F",
    "automobilismo":"\uD83C\uDFCE\uFE0F","superbike":"\uD83C\uDFCE\uFE0F","wrc":"\uD83C\uDFCE\uFE0F",
    "rally":"\uD83C\uDFCE\uFE0F","dakar":"\uD83C\uDFCE\uFE0F","dtm":"\uD83C\uDFCE\uFE0F",
    "spa 24h":"\uD83C\uDFCE\uFE0F","24h de spa":"\uD83C\uDFCE\uFE0F","gptv":"\uD83C\uDFCE\uFE0F",
    "spacex":"\uD83D\uDE80","falcon 9":"\uD83D\uDE80","starship":"\uD83D\uDE80",
    "liftoff":"\uD83D\uDE80","rocket launch":"\uD83D\uDE80","blue origin":"\uD83D\uDE80",
    "artemis":"\uD83D\uDE80","crew dragon":"\uD83D\uDE80","soyuz":"\uD83D\uDE80",
    "ufc":"\uD83E\uDD4A","bellator":"\uD83E\uDD4A","pfl":"\uD83E\uDD4A","one championship":"\uD83E\uDD4A",
    "glory kickboxing":"\uD83E\uDD4A","wbo":"\uD83E\uDD4A","wbc":"\uD83E\uDD4A","wba":"\uD83E\uDD4A",
    "libertadores":"\u26BD","brasileir\u00e3o":"\u26BD","champions league":"\u26BD",
    "europa league":"\u26BD","copa do mundo":"\u26BD","world cup":"\u26BD",
    "serie a":"\u26BD","la liga":"\u26BD","premier league":"\u26BD",
    "bundesliga":"\u26BD","ligue 1":"\u26BD","eredivisie":"\u26BD",
    "copa am\u00e9rica":"\u26BD","copa america":"\u26BD","eurocopa":"\u26BD",
    "sul-americana":"\u26BD","recopa":"\u26BD","supercopa":"\u26BD",
    "copa do brasil":"\u26BD","copa s\u00e3o paulo":"\u26BD",
    "nba":"\uD83C\uDFC0","wnba":"\uD83C\uDFC0","nbl":"\uD83C\uDFC0","euroleague":"\uD83C\uDFC0",
    "wimbledon":"\uD83C\uDFBE","roland garros":"\uD83C\uDFBE","us open":"\uD83C\uDFBE",
    "australian open":"\uD83C\uDFBE","atp":"\uD83C\uDFBE","wta":"\uD83C\uDFBE",
    "superliga":"\uD83C\uDFD0","nfl":"\uD83C\uDFC8","super bowl":"\uD83C\uDFC8",
    "mlb":"\u26BE","nhl":"\uD83C\uDFD2","olympics":"\uD83C\uDFFF","olimp\u00edadas":"\uD83C\uDFFF",
    "lula":"🦑",
    "bolsonaro":"🏛️","trump":"🏛️",
    "stf":"🏛️","tse":"🏛️","tcu":"🏛️","cpi":"🏛️",
    "c\u00e2mara dos deputados":"🏛️","senado federal":"🏛️",
    "white house":"🏛️","capitol":"🏛️","kremlin":"🏛️",
    "nasa":"🪐","esa":"🪐","isro":"🪐","roscosmos":"🪐",
    "jwst":"🪐","hubble":"🪐","kepler":"🪐","voyager":"🪐",
    "astronomia":"🪐","astronomy":"🪐",
    "marte":"🪐","mars":"🪐","jupiter":"🪐","j\u00fapiter":"🪐",
    "saturno":"🪐","saturn":"🪐","venus":"🪐","v\u00eanus":"🪐",
    "neptuno":"🪐","neptune":"🪐","plut\u00e3o":"🪐","pluto":"🪐",
    "merc\u00fario":"🪐","mercury":"🪐",
    "universo":"🪐","universe":"🪐","cosmos":"🪐","spacetime":"🪐",
    "via l\u00e1ctea":"🪐","milky way":"🪐","nebulosa":"🪐","nebula":"🪐",
    "buraco negro":"🪐","black hole":"🪐","supernova":"🪐",
    "breaking news":"📰","\u00faltima hora":"📰","ultima hora":"📰",
    "globonews":"📰","band news":"📰","record news":"📰","cnn brasil":"📰",
    "jornal nacional":"📰","jornal da globo":"📰","jornal da band":"📰",
    "jornal da record":"📰","bom dia brasil":"📰","fant\u00e1stico":"📰",
    "plant\u00e3o":"📰","plantao":"📰",
    "al jazeera":"📰","reuters":"📰","associated press":"📰","bloomberg":"📰",
    "peppa pig":"🧸","patrulha canina":"🧸","paw patrol":"🧸",
    "galinha pintadinha":"🧸","turma da m\u00f4nica":"🧸","turma da monica":"🧸",
    "mickey":"🧸","disney":"🧸","pixar":"🧸","dreamworks":"🧸",
    "chaves":"🧸","bob esponja":"🧸","spongebob":"🧸",
    "naruto":"🧸","dragon ball":"🧸","one piece":"🧸","demon slayer":"🧸",
    "jujutsu kaisen":"🧸","attack on titan":"🧸","my hero academia":"🧸",
    "studio ghibli":"🧸","crunchyroll":"🧸",
    "gameplay":"🎮","speedrun":"🎮","esports":"🎮","e-sports":"🎮",
    "gta":"🎮","gta 6":"🎮","gta vi":"🎮",
    "minecraft":"🎮","fortnite":"🎮","valorant":"🎮",
    "free fire":"🎮","garena":"🎮",
    "league of legends":"🎮","lol":"🎮",
    "counter strike":"🎮","counter-strike":"🎮","cs:go":"🎮","cs2":"🎮",
    "roblox":"🎮","apex legends":"🎮","overwatch":"🎮",
    "call of duty":"🎮","cod warzone":"🎮","warzone":"🎮",
    "fifa 24":"🎮","ea fc":"🎮","elden ring":"🎮",
    "world of warcraft":"🎮","wow":"🎮","dota 2":"🎮","dota":"🎮",
    "pubg":"🎮","rocket league":"🎮","fall guys":"🎮",
    "among us":"🎮","zelda":"🎮","mario":"🎮","pokemon":"🎮",
    "pok\u00e9mon":"🎮","playstation":"🎮","xbox":"🎮","nintendo":"🎮",
    "rock in rio":"🎶","lollapalooza":"🎶","coachella":"🎶",
    "primavera sound":"🎶","tomorrowland":"🎶","grammy":"🎶",
    "brit awards":"🎶","mtv":"🎶","vma":"🎶","festival":"🎶"
  };

  var p2 = {
    "corrida":"\uD83C\uDFCE\uFE0F","grand prix":"\uD83C\uDFCE\uFE0F","grande pr\u00eamio":"\uD83C\uDFCE\uFE0F",
    "grande premio":"\uD83C\uDFCE\uFE0F","kart":"\uD83C\uDFCE\uFE0F","kartismo":"\uD83C\uDFCE\uFE0F",
    "pit stop":"\uD83C\uDFCE\uFE0F","pit lane":"\uD83C\uDFCE\uFE0F","paddock":"\uD83C\uDFCE\uFE0F",
    "foguete":"\uD83D\uDE80","rocket":"\uD83D\uDE80","spaceflight":"\uD83D\uDE80",
    "lan\u00e7amento espacial":"\uD83D\uDE80","space launch":"\uD83D\uDE80",
    "luta":"\uD83E\uDD4A","boxe":"\uD83E\uDD4A","boxing":"\uD83E\uDD4A","mma":"\uD83E\uDD4A",
    "kickboxing":"\uD83E\uDD4A","muay thai":"\uD83E\uDD4A","wrestling":"\uD83E\uDD4A",
    "jiu-jitsu":"\uD83E\uDD4A","jiu jitsu":"\uD83E\uDD4A","karate":"\uD83E\uDD4A",
    "karat\u00ea":"\uD83E\uDD4A","tae kwon do":"\uD83E\uDD4A","taekwondo":"\uD83E\uDD4A",
    "futebol":"\u26BD","football":"\u26BD","soccer":"\u26BD",
    "gol":"\u26BD","p\u00eanalti":"\u26BD","penalti":"\u26BD","penalty":"\u26BD",
    "basquete":"\uD83C\uDFC0","basketball":"\uD83C\uDFC0",
    "v\u00f4lei":"\uD83C\uDFD0","volei":"\uD83C\uDFD0","volleyball":"\uD83C\uDFD0",
    "t\u00eanis":"\uD83C\uDFBE","tenis":"\uD83C\uDFBE","tennis":"\uD83C\uDFBE",
    "futebol americano":"\uD83C\uDFC8","american football":"\uD83C\uDFC8",
    "beisebol":"\u26BE","baseball":"\u26BE",
    "nata\u00e7\u00e3o":"\uD83C\uDFCA","natacao":"\uD83C\uDFCA","swimming":"\uD83C\uDFCA",
    "atletismo":"\uD83C\uDFC3","athletics":"\uD83C\uDFC3","marathon":"\uD83C\uDFC3","maratona":"\uD83C\uDFC3",
    "ciclismo":"\uD83D\uDEB4","cycling":"\uD83D\uDEB4","tour de france":"\uD83D\uDEB4",
    "surfe":"\uD83C\uDFC4","surf":"\uD83C\uDFC4","surfing":"\uD83C\uDFC4",
    "skate":"\uD83D\uDEF9","skateboard":"\uD83D\uDEF9",
    "pol\u00edtica":"🏛️","politica":"🏛️","politics":"🏛️",
    "elei\u00e7\u00f5es":"🏛️","eleicoes":"🏛️","eleicao":"🏛️",
    "election":"🏛️","elections":"🏛️",
    "parliament":"🏛️","parlamento":"🏛️",
    "deputado":"🏛️","deputada":"🏛️","vereador":"🏛️","vereadora":"🏛️",
    "senado":"🏛️","senador":"🏛️","senadora":"🏛️","senate":"🏛️",
    "congresso":"🏛️","congress":"🏛️",
    "governo":"🏛️","government":"🏛️","governor":"🏛️","governador":"🏛️",
    "presidente":"🏛️","president":"🏛️",
    "democrats":"🏛️","republicans":"🏛️",
    "prefeito":"🏛️","prefeita":"🏛️","prefeitura":"🏛️",
    "impeachment":"🏛️","plebiscito":"🏛️","referendo":"🏛️",
    "espa\u00e7o":"🪐","espaco":"🪐",
    "gal\u00e1xia":"🪐","galaxia":"🪐","galaxy":"🪐",
    "sat\u00e9lite":"🪐","satelite":"🪐","satellite":"🪐",
    "orbit":"🪐","\u00f3rbita":"🪐","orbita":"🪐",
    "telescope":"🪐","telesc\u00f3pio":"🪐","telescopio":"🪐",
    "lua":"🪐","moon":"🪐","estrelas":"🪐","stars":"🪐",
    "asteroide":"🪐","asteroid":"🪐","cometa":"🪐","comet":"🪐",
    "constel\u00e7\u00e3o":"🪐","constelacao":"🪐","constellation":"🪐",
    "eclipse":"🪐","aurora boreal":"🪐","aurora borealis":"🪐",
    "esta\u00e7\u00e3o espacial":"🪐","estacao espacial":"🪐","space station":"🪐",
    "f\u00edsica":"🔬","fisica":"🔬","physics":"🔬",
    "qu\u00edmica":"🔬","quimica":"🔬","chemistry":"🔬",
    "biologia":"🔬","biology":"🔬",
    "cient\u00edfico":"🔬","cientifico":"🔬","scientific":"🔬","scientist":"🔬",
    "quantum":"🔬","qu\u00e2ntico":"🔬","quantico":"🔬",
    "ci\u00eancia":"🔬","ciencia":"🔬","science":"🔬",
    "tecnologia":"🔬","technology":"🔬",
    "laborat\u00f3rio":"🔬","laboratorio":"🔬","laboratory":"🔬",
    "pesquisa":"🔬","research":"🔬",
    "experimento":"🔬","experiment":"🔬",
    "engenharia":"🔬","engineering":"🔬",
    "matem\u00e1tica":"🔬","matematica":"🔬","mathematics":"🔬",
    "intelig\u00eancia artificial":"🔬","inteligencia artificial":"🔬","artificial intelligence":"🔬",
    "machine learning":"🔬","deep learning":"🔬",
    "rob\u00f3tica":"🔬","robotica":"🔬","robotics":"🔬",
    "not\u00edcia":"📰","noticia":"📰",
    "jornal":"📰","journal":"📰","newspaper":"📰",
    "notici\u00e1rio":"📰","noticiario":"📰",
    "cnn":"📰","bbc":"📰","nbc":"📰","abc news":"📰",
    "fox news":"📰","sky news":"📰","euronews":"📰",
    "broadcast":"📰","reportagem":"📰","report":"📰",
    "entrevista":"📰","interview":"📰",
    "coletiva":"📰","press conference":"📰",
    "debate":"📰",
    "desenho":"🧸","desenhos":"🧸",
    "cartoon":"🧸","cartoons":"🧸",
    "infantil":"🧸","crian\u00e7a":"🧸","crian\u00e7as":"🧸",
    "anima\u00e7\u00e3o":"🧸","animacao":"🧸","animation":"🧸",
    "animated":"🧸",
    "jogos":"🎮","gaming":"🎮","jogando":"🎮",
    "streamer":"🎮","streaming game":"🎮",
    "let's play":"🎮","playthrough":"🎮","walkthrough":"🎮",
    "twitch":"🎮","live de jogo":"🎮",
    "m\u00fasica":"🎶","musica":"🎶","music":"🎶",
    "show ao vivo":"🎶","live concert":"🎶","concert":"🎶","concerto":"🎶",
    "karaoke":"🎶","karaok\u00ea":"🎶"
  };

  var p3 = {
    "copa":"\u26BD","fifa":"\u26BD","uefa":"\u26BD","conmebol":"\u26BD",
    "fight":"\uD83E\uDD4A","combate":"\uD83E\uDD4A","nocaute":"\uD83E\uDD4A","knockout":"\uD83E\uDD4A",
    "news":"📰","live news":"📰",
    "game":"🎮","games":"🎮","jogo":"🎮",
    "kids":"🧸","children":"🧸",
    "song":"🎶","songs":"🎶","playlist":"🎶","dj":"🎶"
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
      var d1 = C_clean[cleanCountryName(m[1])];
      var d2 = C_clean[cleanCountryName(m[2])];
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

  function applyRate(rate) {
    if (bridgeData.statsAvailable) {
      document.dispatchEvent(new CustomEvent("DelayBridgeSetRate", { detail: { rate: rate } }));
    }
    try { if (video) video.playbackRate = rate; } catch(e) {}
    currentRate = rate;
    appliedRate = rate;
  }

  function onVideoWaiting() {
    if (!video) return;
    applyRate(1.0);
    log("Waiting event.");
    if (!settings.enabled) return;
    var now = Date.now();
    if (now < stallCooldownUntil || now - lastStall < 5000) return;
    lastStall = now;
    stallTimes = stallTimes.filter(function(t) { return now - t < 60000; });
    stallTimes.push(now);
    if (stallTimes.length >= 2) {
      stallTimes = [];
      stallCooldownUntil = now + 60000;
      var curCdn = bridgeData && bridgeData.latency > 0 ? bridgeData.latency : 0;
      if (curCdn > 0 && (cdnFloor === 0 || curCdn < cdnFloor + 2.0)) {
        cdnFloor = curCdn + 1.0;
        log("CDN floor: " + cdnFloor.toFixed(1) + "s");
      }
      var order = ["ultra", "aggressive", "custom", "conservative"];
      var idx = order.indexOf(settings.profile);
      if (idx >= 0 && idx < order.length - 1) {
        settings.profile = order[idx + 1];
        chrome.storage.local.set({ profile: settings.profile });
        log("Stall watchdog: downgrade para " + settings.profile);
      }
    }
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
    if (now - meta.lastRefresh < 1500) return;
    meta.lastRefresh = now;

    var t = document.querySelector("ytd-watch-metadata #title h1 yt-formatted-string, ytd-watch-metadata #title h1, .ytp-title-link");
    meta.title = t ? t.textContent.trim() : "";

    var c = document.querySelector("#owner ytd-channel-name yt-formatted-string a, ytd-video-owner-renderer ytd-channel-name a");
    meta.channel = c ? c.textContent.trim() : "";

    var a = document.querySelector("#owner yt-img-shadow#avatar img, ytd-video-owner-renderer yt-img-shadow img");
    meta.avatar = a ? a.src : "";

    meta.viewers = "";

    // 1. Prioridade: Seletor do Player Nativo (Atualizado rápido e imune ao scroll da página)
    var fsMeta = document.querySelector(".ytp-fullscreen-metadata .ytPlayerOverlayVideoDetailsRendererSubtitle span");
    if (fsMeta) {
      var vmf = (fsMeta.textContent || "").match(/([\d.,]+)\s*(?:assistindo|watching)/i);
      if (vmf) meta.viewers = vmf[1];
    }

    if (!meta.viewers) {
      var viewCount = document.querySelector("#view-count[aria-label]");
      if (viewCount) {
        var ariaLabel = viewCount.getAttribute("aria-label") || "";
        var vm = ariaLabel.match(/([\d.,]+)\s*(?:assistindo|watching)/i);
        if (vm) meta.viewers = vm[1];
      }
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
    var buf = bridgeData && bridgeData.bufferHealth > 0 ? bridgeData.bufferHealth : getBufferHealth();

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
      sport: d.sport,
      cdnFloor: cdnFloor
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
    seekAttempt++;

    log("Seek #" + seekAttempt + " | End: " + end.toFixed(2) + " | Pos: " + video.currentTime.toFixed(2));

    var method = seekAttempt % 3;
    if (method === 1) {
      document.dispatchEvent(new CustomEvent("DelayBridgeSeek"));
    } else if (method === 2) {
      var badge = document.querySelector(".ytp-live-badge");
      if (badge) { badge.click(); }
      else { document.dispatchEvent(new CustomEvent("DelayBridgeSeek")); }
    } else {
      video.currentTime = end - tgt;
    }

    applyRate(1.0);
    catchingUp = false;
  }

  function isWatchOrLivePage() {
    return location.pathname.startsWith("/watch") || location.pathname.startsWith("/live");
  }

  function tick() {
    if (!isContextValid() || window.__semAtrasoActiveInstance !== myInstanceId) {
      clearInterval(tickIntervalId);
      try { if (video) video.removeEventListener("waiting", onVideoWaiting); } catch(e) {}
      return;
    }
    if (!settings.enabled) return;
    if (!isWatchOrLivePage()) return;

    grabPlayer();
    checkError();
    if (!video || video.paused || !isLive()) return;
    if (isAd()) { if (currentRate !== 1.0) applyRate(1.0); return; }
    if (video.readyState < 3) { if (currentRate !== 1.0) applyRate(1.0); return; }
    if (isSeeking()) { if (currentRate !== 1.0) applyRate(1.0); return; }
    if (Date.now() - lastStall < 5000) { return; }

    if (bridgeData.playerRate > 0) {
      var cur = bridgeData.playerRate;
      if (Math.abs(cur - appliedRate) > 0.01) {
        if (Math.abs(cur - 1.0) < 0.01) { yieldedToUser = false; }
        else { yieldedToUser = true; appliedRate = cur; }
      }
    }
    if (yieldedToUser) return;

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

    var cdnLat = bridgeData && bridgeData.latency > 0 ? bridgeData.latency : 0;
    var tgt = target();
    var rawBuf = bridgeData && bridgeData.bufferHealth > 0 ? bridgeData.bufferHealth : getBufferHealth();
    var lat = cdnLat > 0 ? cdnLat : (scrubberDrift > 2 ? scrubberDrift : 0);

    bufferEma = bufferEma === null ? rawBuf : bufferEma * 0.9 + rawBuf * 0.1;
    if (lastBufHealth !== null) drainEma = drainEma * 0.95 + (rawBuf - lastBufHealth) * 0.05;
    lastBufHealth = rawBuf;

    var latFloor = Math.max(Math.max(0.5, tgt * 0.8), cdnFloor);
    if (lat < latFloor) {
      if (currentRate !== 1.0) { applyRate(1.0); log("Norm 1.0x | Lat floor (" + latFloor.toFixed(1) + ")"); }
      catchingUp = false;
      return;
    }

    if (bufferEma > tgt + CATCH_UP_BAND) catchingUp = true;
    else if (bufferEma <= tgt) catchingUp = false;

    if (!catchingUp) {
      if (currentRate !== 1.0) { applyRate(1.0); log("Norm 1.0x | Histerese off"); }
      return;
    }

    if (drainEma < DRAIN_BRAKE) {
      if (currentRate !== 1.0) { applyRate(1.0); log("Norm 1.0x | Buffer drenando"); }
      return;
    }

    if (rawBuf < BUFFER_FLOOR) {
      if (currentRate !== 1.0) { applyRate(1.0); log("Norm 1.0x | Buffer piso"); }
      return;
    }

    var rate = 1.0;
    var critical = lat > tgt + 5.0 && rawBuf > 3.0;

    switch (settings.profile) {
      case "ultra": rate = critical ? 1.25 : 1.15; break;
      case "aggressive": rate = critical ? 1.20 : 1.10; break;
      case "conservative": rate = critical ? 1.08 : 1.05; break;
      case "custom": rate = critical ? 1.20 : 1.10; break;
      default: rate = 1.06;
    }

    if (rawBuf < 1.5) rate = Math.min(rate, 1.05);

    if (currentRate !== rate) {
      log(rate + "x | CDN:" + lat.toFixed(1) + "s Buf:" + rawBuf.toFixed(1) + "s EMA:" + bufferEma.toFixed(1) + "s Drain:" + drainEma.toFixed(3) + " Tgt:" + tgt + "s");
      applyRate(rate);
    }
  }

  var tickIntervalId = setInterval(tick, 500);

  window.addEventListener("yt-navigate-finish", function () {
    if (video) { try { applyRate(1.0); } catch (e) {} }
    currentUrl = "";
    recoveryAttempts = 0;
    seekAttempt = 0;
    meta.lastRefresh = 0;
    lastSeekTime = 0;
    currentRate = 1.0;
    bridgeData = { latency: -1, playbackRate: 1.0, isLive: false, isAtLiveHead: false, bufferHealth: -1, playerRate: -1, statsAvailable: false };
    bufferEma = null;
    lastBufHealth = null;
    drainEma = 0;
    catchingUp = false;
    appliedRate = 1.0;
    yieldedToUser = false;
    stallTimes = [];
    lastStall = 0;
    cdnFloor = 0;
    grabPlayer();
  });

  chrome.runtime.onMessage.addListener(function (req, sender, respond) {
    if (req.action === "getStatus") {
      respond(getStatus());
    } else if (req.action === "updateSettings") {
      settings = Object.assign({}, settings, req.settings);
      chrome.storage.local.set(settings);
      yieldedToUser = false;
      if (!settings.enabled && video) {
        try { applyRate(1.0); } catch (e) {}
      }
      respond({ success: true });
    }
    return true;
  });
})();
