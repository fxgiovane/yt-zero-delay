var CURRENT_VERSION = "2.2";
var REPO = "fxgiovane/yt-zero-delay";
var CHECK_INTERVAL = 24 * 60 * 60 * 1000;

function checkUpdate() {
  fetch("https://api.github.com/repos/" + REPO + "/releases/latest", {
    headers: { "Accept": "application/vnd.github+json" }
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var latest = (data.tag_name || "").replace(/^v/, "");
    var hasUpdate = latest && latest !== CURRENT_VERSION && latest > CURRENT_VERSION;
    chrome.storage.local.set({ updateAvailable: hasUpdate, latestVersion: latest });
  })
  .catch(function() {});
}

chrome.runtime.onInstalled.addListener(function() {
  checkUpdate();
  chrome.tabs.query({ url: "*://*.youtube.com/*" }, function(tabs) {
    if (chrome.runtime.lastError || !tabs) return;
    tabs.forEach(function(tab) {
      if (!tab.id) return;
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content.js"]
      }, function() {
        if (chrome.runtime.lastError) {}
      });
    });
  });
});

chrome.alarms.create("updateCheck", { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === "updateCheck") checkUpdate();
});

chrome.storage.local.get("lastUpdateCheck", function(r) {
  var now = Date.now();
  if (!r.lastUpdateCheck || now - r.lastUpdateCheck > CHECK_INTERVAL) {
    chrome.storage.local.set({ lastUpdateCheck: now });
    checkUpdate();
  }
});
