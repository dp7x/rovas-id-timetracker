// background.js

console.log("[ROVAS Background] Service Worker started.");

// Fetching from background is necessary to respect CORS
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.contentScriptQuery == 'fetchUrl') {
    fetch(request.site, request.payload)
    .then( async (response) => {
        const text = await response.text();
        sendResponse(
          {
            status: response.status,
            ok: response.ok,
            text: text  // is a string, NOT A PROMISE
          }
        );
    })
    .catch((error) => {
      console.error("[ROVAS] error with sending a message: ", error);
      sendResponse(
          {
            status: 400,
            ok: false,
            text: ""
          }
        );
    });
    return true;
  }
});

// Listener to capture changeset ID by OSM API request
chrome.webRequest.onCompleted.addListener(
  function(details) {
    // Looking for URL '/changeset/{id}/upload' or '/changeset/{id}/close'
    const url = new URL(details.url);

    // Regex to get id from /changeset/123456789/upload or /changeset/123456789/close
    const match = url.pathname.match(/\/changeset\/(\d+)\/(upload|close)/);

    if (match && match[1]) {
      const changesetId = match[1];
      console.log(`%c[ROVAS Background] ID Changeset Found: ${changesetId} from request: ${details.url}`, 'color: cyan; font-weight: bold;');

      // Send changeset ID to the content script 
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (
		  tabs[0] &&
		  (tabs[0].url.startsWith("https://www.openstreetmap.org/edit") ||
		  tabs[0].url.startsWith("https://www.openhistoricalmap.org/edit") ||
		  tabs[0].url.startsWith("https://rapideditor.org/edit"))
		) {

          // Sends only if active tab is ID editor 
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "CHANGESET_ID_DETECTED",
            changesetId: changesetId,
            siteName: tabs[0].url.startsWith("https://www.openhistoricalmap.org/edit") ? "OpenHistoricalMap" : "OpenStreetMap"
          });
        }
      });
    }
  },
  // Filters only URLs of OSM API that we are interested to check
  { 
    urls: ["https://api.openstreetmap.org/api/0.6/changeset/*", 
    "https://www.openhistoricalmap.org/api/0.6/changeset/*"]  // yes, it's "www.", not "api." 
  }
);