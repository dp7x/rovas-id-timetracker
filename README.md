## **ROVAS Connector for OpenStreetMap iD Editor**

This cross-browser extension integrates with the OpenStreetMap (OSM) iD or Rapid editor and OpenHistoricalMap (OHM) iD editor, automatically tracking your mapping time and submitting work reports to the [ROVAS App](https://rovas.app/). Chrome and Firefox builds share the same application code and use browser-specific manifests.


## Chrome and Firefox

Both browser versions are maintained in **this repository** and share the same features, translations, popup and editor timer. Only the browser manifests differ.

- **Chrome / Chromium:** [Install from the Chrome Web Store](https://chromewebstore.google.com/detail/rovas-connector-for-id-ed/ddjhgjigninagcaneanjmnbjgjangkpp).
- **Firefox:** Build the Firefox package from this repository and load it using the [Firefox instructions below](#load-the-firefox-build).

Store releases may lag behind the source code in this repository.


________________________________________


**Features**

- Interface languages: English, Hungarian, Slovak, Italian, German, French, and Spanish. The popup and editor timer use the saved language or detect the browser language automatically.

- New Comment Notifications: Shows pending notifications for new comments on reports you follow in Rovas, with a direct link to each comment.
- Reports to Validate and User Stats: Shows assigned report verifications and your Merits and Chrons balances.
- Automatic Time Tracking: Records time spent actively editing in the OpenStreetMap **iD** or **Rapid** editors.
- ROVAS Integration: Automatically submits detailed work reports to the ROVAS App upon changeset upload.
- User-Configurable Credentials: Securely store your ROVAS API Key and Token via the extension's popup.
- Session Control: Start, pause, and stop your mapping sessions directly from a convenient on-screen timer.
- Changeset Data Inclusion: Captures your OSM changeset ID and comment for richer ROVAS reports.
- Shareholder Verification: Automatically checks and registers your participation in the [OpenStreetMap project](https://rovas.app/openstreetmap) or [OpenHistoricalMap project](https://rovas.app/OpenHistoricalMap) within Rovas.

________________________________________


**Installation**

For Chrome, use the store link above or build the extension locally. For Firefox, use the Firefox build from this same repository. You do not need a separate checkout or to copy changes between browser projects.

The following build instructions are for development and local testing. Configuration and usage below apply to both browsers.

Prerequisites: 
- Node.js 18 or later for development builds
- Google Chrome, a Chromium-based browser, or Firefox 140 or later (as required by the Firefox manifest)
- ROVAS Account: You must be a registered user in the [ROVAS App](https://rovas.app/) and have your API KEY and TOKEN (available on your account page).

**Build both browsers**

```sh
npm run check
npm run build
```

This creates `dist/chrome` and `dist/firefox`. Each directory contains the shared source files and the correct `manifest.json` for that browser. You can also run `npm run build:chrome` or `npm run build:firefox` separately.

### Load the Chrome build

1. Open `chrome://extensions` and enable Developer mode.
2. Click **Load unpacked**.
3. Select `dist/chrome`.

### Load the Firefox build

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `dist/firefox/manifest.json`.

This is a temporary development installation: Firefox removes it when the browser closes. After updating the source, rebuild with `npm run build:firefox` and click **Reload** in `about:debugging`. For Chrome, rebuild with `npm run build:chrome` and reload the extension at `chrome://extensions`.

The root `manifest.json` remains the Chrome manifest for backward compatibility with the existing unpacked-install workflow.

Firefox support was made possible by the practical port and testing work contributed by [@filip-769](https://github.com/filip-769/rovas-id-connector-for-firefox).


________________________________________


**Configuration**

After installation, you need to configure your ROVAS API credentials:
1.	Open the Extension Popup: Click on the "ROVAS Connector for iD Editor" icon in your Chrome or Firefox toolbar.
   <img width="597" height="72" alt="Image" src="https://github.com/dp7x/rovas-id-timetracker/blob/main/readme/idr4.png" />

2.	Enter Credentials: In the popup window, you'll find fields for your "API KEY" and "TOKEN."
3.	Save Credentials: Enter your respective API Key and Token from your ROVAS account page, then click the "Save Credentials" button. A confirmation message will appear just below the button.
   <img width="400" alt="Image" src="https://github.com/dp7x/rovas-id-timetracker/blob/main/readme/idr5.png" />

________________________________________


**Usage**

1.	Start Mapping: Navigate to the OpenStreetMap iD editor (https://www.openstreetmap.org/edit) or Rapid editor (https://rapideditor.org/edit). For OpenHistoricalMap, navigate to its iD editor (https://www.openhistoricalmap.org/edit).
2.	Timer Badge: You should see a small timer badge appear in the bottom-right corner of the editor. The timer will automatically start when the page loads.
    - Use the "Pause" button to temporarily stop tracking time.
    - Use the "Start" button to resume a paused session or begin a new one if it was manually stopped.
    - Use the "Stop" button to manually end the current mapping session. (Note: Manually stopping will not generate a ROVAS report.)
    <img width="610" height="377" alt="Image" src="https://github.com/dp7x/rovas-id-timetracker/blob/main/readme/idr6.png" />

3.	Upload Changeset: When you are finished with your edits, upload your changeset as usual.
4.	Confirmation: Upon successful changeset upload, the extension will automatically attempt to submit a work report to ROVAS. You should see a confirmation message appear from the extension.
   
   	<img width="477" alt="Image" src="https://github.com/dp7x/rovas-id-timetracker/blob/main/readme/idr7.png" />
    
    **NOTE**: This message will summarize the work time and give you the option to adjust it if it's too high (for example, if you took a break during mapping). Always keep in mind that your report will need to be validated by two other Rovas users, so excessive times may result in rejection. For this reason, the time can only be adjusted downward.

5. As a Rovas user, you'll be expected to be an active member of the community. Therefore, if you submit work reports, you'll also be responsible for reviewing those uploaded by other users. The platform will determine which ones are up to date, and you'll receive an email for each one, which you'll need to review by a set deadline. To make it easier for you, the links to these reports will also be listed within this extension and will be updated each time you open the popup. Clicking these links will take you to the Rovas page, where you can easily review them using the tools provided by the app.
Last but not least, there's also a tab summarizing your statistics, i.e., the number of merits and chrons you've earned for your work. 

    <img width="400" alt="Image" src="https://github.com/dp7x/rovas-id-timetracker/blob/main/readme/idr8.png" />
    

________________________________________


**Contributing**

Contributions are welcome! If you have suggestions for improvements, bug reports, or would like to contribute code, please feel free to:
1.	Open an issue on this GitHub repository.
2.	Fork the repository and submit a pull request with your changes.

________________________________________


**License**

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

________________________________________


**Contact**

For questions or feedback, please open an issue on this GitHub repository.

## New comment notifications

The popup loads pending watched-comment notices when opened and after saving credentials. Each notification occupies one line: click the report title to open the comment. The report ID is shown alongside the title; the date/time and full title appear on hover. Reopen the popup to check again. The API supplies notification metadata, not the comment body or author.

Notifications are not hidden or stored locally. Rovas manages the pending list: after opening the comment while signed into the same Rovas account, reopen the popup to fetch the updated list.

Alexander confirmed that users are not notified about their own comments and that visiting the report or comment on Rovas removes the pending notification. The extension does not call the session-based `/comment-watch/dismiss/` URL. Which reports a user automatically follows is determined by Rovas; the extension displays the notices returned by the API without project filtering. There are no operating-system notifications; the toolbar badge checks for pending items in the background as described below.

## Toolbar notification badge

Chrome and Firefox show the combined number of reports to validate and pending new-comment notices on the extension icon (up to `99+`). The badge is orange for reports only, red whenever there are new comments, and empty when neither is pending. Hover over the icon for the separate counts in your selected language. Pin the extension to the browser toolbar to keep the badge visible.

The extension checks at browser startup, installation/update, when credentials or language change, when opening the popup, and every 15 minutes while the browser is running. The `alarms` permission schedules these checks. Timing can be delayed by the browser or device sleep. Opening the popup does not dismiss items; Rovas determines what remains pending. After reading a comment or validating a report, reopen the popup or wait for the next check.

A failed check keeps the existing badge and changes the tooltip to indicate the update failed. Both endpoints must return valid responses before the combined count changes. Switching credentials clears the previous account’s badge before fetching the new counts. No report titles, comment bodies or counts are stored in extension storage by the badge.
