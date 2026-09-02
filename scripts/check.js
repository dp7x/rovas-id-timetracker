const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const chrome = JSON.parse(fs.readFileSync(path.join(root, "manifests", "chrome.json"), "utf8"));
const firefox = JSON.parse(fs.readFileSync(path.join(root, "manifests", "firefox.json"), "utf8"));

if (chrome.version !== firefox.version) {
  throw new Error("Chrome and Firefox manifest versions must match");
}
if (!chrome.background?.service_worker) {
  throw new Error("Chrome manifest must define a background service worker");
}
if (!Array.isArray(firefox.background?.scripts)) {
  throw new Error("Firefox manifest must define background scripts");
}
if (!firefox.browser_specific_settings?.gecko?.id) {
  throw new Error("Firefox manifest must define a Gecko extension ID");
}

console.log(`Manifest checks passed for version ${chrome.version}`);
