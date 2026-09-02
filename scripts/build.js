const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const supportedBrowsers = ["chrome", "firefox"];
const requestedBrowser = process.argv[2];
const browsers = requestedBrowser ? [requestedBrowser] : supportedBrowsers;
const sharedFiles = [
  "background.js",
  "content.js",
  "popup.html",
  "popup.js",
  "icon16.png",
  "icon48.png",
  "locales"
];

for (const browser of browsers) {
  if (!supportedBrowsers.includes(browser)) {
    console.error(`Unsupported browser: ${browser}`);
    process.exit(1);
  }

  const outputDir = path.join(root, "dist", browser);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of sharedFiles) {
    fs.cpSync(path.join(root, file), path.join(outputDir, file), {
      recursive: true
    });
  }

  fs.copyFileSync(
    path.join(root, "manifests", `${browser}.json`),
    path.join(outputDir, "manifest.json")
  );

  console.log(`Built dist/${browser}`);
}
