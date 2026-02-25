## **ROVAS Connector for OpenStreetMap iD Editor**

This Chrome extension is designed to seamlessly integrate with the OpenStreetMap (OSM) iD or Rapid editor and OpenHistoricalMap (OHM) iD editor, automatically tracking your mapping time and submitting work reports to the [ROVAS App](https://rovas.app/). It simplifies the process of reporting your contributions to the OSM and OHM projects on Rovas, ensuring accurate and effortless time logging.


## You can find the packed extension, ready to install on your browser, at the Chrome Web Store. Click here to [Download](https://chromewebstore.google.com/detail/rovas-connector-for-id-ed/ddjhgjigninagcaneanjmnbjgjangkpp) ##

**The following instructions are for developers only.**


________________________________________


**Features**

- Automatic Time Tracking: Records time spent actively editing in the OpenStreetMap **iD** or **Rapid** editors.
- ROVAS Integration: Automatically submits detailed work reports to the ROVAS App upon changeset upload.
- User-Configurable Credentials: Securely store your ROVAS API Key and Token via the extension's popup.
- Session Control: Start, pause, and stop your mapping sessions directly from a convenient on-screen timer.
- Changeset Data Inclusion: Captures your OSM changeset ID and comment for richer ROVAS reports.
- Shareholder Verification: Automatically checks and registers your participation in the [OpenStreetMap project](https://rovas.app/openstreetmap) or [OpenHistoricalMap project](https://rovas.app/OpenHistoricalMap) within Rovas.

________________________________________


**Installation**

Please note that this extension is currently released in developer mode and is not yet packaged. To install it, you will need to load it as an "unpacked" extension in Chrome.

Prerequisites: 
- Google Chrome (or Chrome based Openstreetmap App)
- ROVAS Account: You must be a registered user in the [ROVAS App](https://www.google.com/search?q=https://neofund.sk/rovas-api%23) and have your API KEY and TOKEN (available on your account page).

**Steps to Install**

1.	Prepare the Extension Files:
    - Create a new folder on your computer (e.g., ROVAS_Connector_Extension).
    - Download all files from this GitHub repository (the manifest.json, content.js, background.js, popup.html, popup.js, and the icon16.png, icon48.png images) and place them directly inside this new folder. Make sure manifest.json is at the very top level of this folder, not inside a subfolder.

2.	Open Chrome Extensions Page:
    - Type chrome://extensions in your Chrome address bar and press Enter.
    <img width="476" height="84" alt="Image" src="https://github.com/dp7x/rovas-id-timetracker/blob/main/readme/idr1.png" />

    - Alternatively, click the three dots (⋮) in the top right corner of Chrome, go to "More tools," and then select "Extensions."

3.	Enable Developer Mode:
    - Locate the "Developer mode" toggle switch, usually in the top right corner of the extensions page, and turn it ON.
    <img width="707" height="138" alt="Image" src="https://github.com/dp7x/rovas-id-timetracker/blob/main/readme/idr2.png" />

4.	Load Unpacked Extension:
    - Click the "Load unpacked" button that appears after enabling Developer Mode.

5.	Select Extension Folder:
    - Navigate to and select the root folder where you placed the extension files (e.g., ROVAS_Connector_Extension/).
    - Click "Select Folder" (or "Open" on some systems) to load the extension.

6.	Verify Installation:
    - The "ROVAS Connector for iD Editor" extension should now appear in your list of installed extensions.
      <img width="321" height="167" alt="Image" src="https://github.com/dp7x/rovas-id-timetracker/blob/main/readme/idr3.png" />

    - It's recommended to reboot Chrome for the extension to fully initialize after installation.


________________________________________


**Configuration**

After installation, you need to configure your ROVAS API credentials:
1.	Open the Extension Popup: Click on the "ROVAS Connector for iD Editor" icon in your Chrome toolbar.
   <img width="597" height="72" alt="Image" src="https://github.com/dp7x/rovas-id-timetracker/blob/main/readme/idr4.png" />

2.	Enter Credentials: In the popup window, you'll find fields for your "API KEY" and "TOKEN."
3.	Save Credentials: Enter your respective API Key and Token from your ROVAS account page, then click the "Save Credentials" button. A confirmation message will appear just below the button.
   <img width="400" alt="Image" src="https://github.com/dp7x/rovas-id-timetracker/blob/main/readme/idr5.png" />

________________________________________


**Usage**

1.	Start Mapping: Navigate to the OpenStreetMap iD editor (https://www.openstreetmap.org/edit) or Rapid editor (https://https://rapideditor.org/edit). For OpenHistoricalMap, navigate to its iD editor (https://www.openhistoricalmap.org/edit).
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

This project is licensed under the MIT License. See the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.

________________________________________


**Contact**

For questions or feedback, please open an issue on this GitHub repository.
