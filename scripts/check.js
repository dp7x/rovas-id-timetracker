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
for (const manifest of [chrome, firefox]) {
  if (!manifest.permissions.includes('alarms')) throw new Error('Notification badge requires alarms permission');
}
for (const script of ['notification-api.js', 'comment-notices.js', 'notification-badge.js']) {
  if (!firefox.background.scripts.includes(script)) throw new Error(`Missing Firefox background dependency: ${script}`);
}

console.log(`Manifest checks passed for version ${chrome.version}`);

const localeDir = path.join(root, "locales");
const { locales } = JSON.parse(fs.readFileSync(path.join(localeDir, "languages.json"), "utf8"));
const english = JSON.parse(fs.readFileSync(path.join(localeDir, "en.json"), "utf8"));
const placeholders = text => (text.match(/\{\w+\}/g) || []).sort().join(",");
for (const locale of locales) {
  const translations = JSON.parse(fs.readFileSync(path.join(localeDir, `${locale}.json`), "utf8"));
  for (const key of Object.keys(english)) {
    if (typeof translations[key] !== "string" || !translations[key].trim()) {
      throw new Error(`Missing translation: ${locale}.${key}`);
    }
    if (placeholders(translations[key]) !== placeholders(english[key])) {
      throw new Error(`Translation placeholders do not match: ${locale}.${key}`);
    }
  }
  for (const code of locales) {
    if (!translations[`lang_${code}`]) throw new Error(`Missing language label: ${locale}.${code}`);
  }
}
console.log(`Translation checks passed for ${locales.length} languages`);
