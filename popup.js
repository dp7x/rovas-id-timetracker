// popup.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: popup.js script started.");

    const rovasPageBtn = document.getElementById('rovasPageBtn');
    const apiKeyInput = document.getElementById('apiKey');
    const tokenInput = document.getElementById('token');
    const saveBtn = document.getElementById('saveBtn');
    const configStatus = document.getElementById('configStatus');
    const langSelect = document.getElementById('langSelect');
    const tempBanner = document.getElementById('tempBanner');
    const tempBannerText = document.getElementById('tempBannerText');
    const feeText = document.getElementById('feeText');
    const companyWorkCheckbox = document.getElementById('companyWorkCheckbox');
    const companyWorkLabel = document.getElementById('companyWorkLabel');
    
    // Elements for Merits and Chrons stats
    const meritsEl = document.getElementById('merits-score');
    const meritsScoreText = document.getElementById('meritsScoreText');
    const chronsEl = document.getElementById('chrons-score');
    const chronsScoreText = document.getElementById('chronsScoreText');

    // Elements for Verifications
    const verificationsListEl = document.getElementById('verifications-list');
    const verificationsStatusEl = document.getElementById('verificationsStatus');
    const reportsToValidateTitle = document.getElementById('reportsToValidateTitle');

    // URLs for the API calls
    const ROVAS_API_BASE_URL = "https://rovas.app/rovas/rules/";
    const ROVAS_VERIFICATIONS_URL = "https://rovas.app/rovas/rovas_verifications.json";

    // Load credentials when the popup opens
    chrome.storage.sync.get(['rovasApiKey', 'rovasToken', 'isCompanyWork'], (result) => {
        if (result.rovasApiKey) {
            apiKeyInput.value = result.rovasApiKey;
        }
        if (result.rovasToken) {
            tokenInput.value = result.rovasToken;
        }
        companyWorkCheckbox.checked = result.isCompanyWork !== undefined ? result.isCompanyWork : false;
        
        // Initial call to update stats on popup open
        updateRovasStats();
    });

    // Helper to get translation object synchronously (from last loaded)
    let lastTranslations = {};
    function getT() { return lastTranslations; }
    let activeLanguage = 'en';
    const commentNotices = RovasCommentNotices.createPanel(getT, () => activeLanguage);

    // Extra diagnostics are available manually, separately from the notification list.
    const checkNotificationsBtn = document.getElementById('checkNotificationsBtn');
    const notificationDiagnosticsStatus = document.getElementById('notificationDiagnosticsStatus');
    const notificationDiagnosticsOutput = document.getElementById('notificationDiagnosticsOutput');
    const notificationDiagnosticsOutputLabel = document.getElementById('notificationDiagnosticsOutputLabel');
    let diagnosticOutcome = null;
    function renderDiagnosticStatus() {
        notificationDiagnosticsStatus.textContent = diagnosticOutcome
            ? getT()['notification_diagnostics_' + diagnosticOutcome] : '';
    }
    checkNotificationsBtn.addEventListener('click', async () => {
        checkNotificationsBtn.disabled = true;
        diagnosticOutcome = 'loading';
        renderDiagnosticStatus();
        notificationDiagnosticsOutput.value = '';
        notificationDiagnosticsOutput.hidden = true;
        notificationDiagnosticsOutputLabel.hidden = true;
        try {
            const credentials = await new Promise(resolve => {
                chrome.storage.sync.get(['rovasApiKey', 'rovasToken'], resolve);
            });
            const diagnostic = await RovasNotificationDiagnostics.inspect(credentials);
            diagnosticOutcome = diagnostic.outcome;
            if (diagnostic.result) {
                notificationDiagnosticsOutput.value = JSON.stringify(diagnostic.result, null, 2);
                notificationDiagnosticsOutput.hidden = false;
                notificationDiagnosticsOutputLabel.hidden = false;
            }
        } catch (error) {
            diagnosticOutcome = 'network_error';
        } finally {
            checkNotificationsBtn.disabled = false;
            renderDiagnosticStatus();
        }
    });

    // Load temporary credentials from storage.local
    function loadTempCreds() {
        chrome.storage.local.get(['tempApiKey', 'tempToken'], (result) => {
            if (result.tempApiKey) apiKeyInput.value = result.tempApiKey;
            if (result.tempToken) tokenInput.value = result.tempToken;
            updateTempState();
        });
    }

    // Save temporary credentials to storage.local
    function saveTempCreds() {
        chrome.storage.local.set({ tempApiKey: apiKeyInput.value, tempToken: tokenInput.value });
    }

    // Remove temporary credentials from storage.local
    function clearTempCreds() {
        chrome.storage.local.remove(['tempApiKey', 'tempToken']);
    }

    // Update banner and Save button state
    function updateTempState() {
        const t = getT();
        const apiKey = apiKeyInput.value.trim();
        const token = tokenInput.value.trim();
        const bothFilled = apiKey && token;
        saveBtn.disabled = !(bothFilled && companyWorkCheckbox.checked);
        if (bothFilled) {
            tempBanner.style.display = 'none';
        } else if (apiKey || token) {
            tempBanner.style.display = 'block';
            tempBannerText.textContent = t.temp_banner || 'Credentials are temporarily saved. Complete both fields and click Save to finish.';
        } else {
            tempBanner.style.display = 'none';
        }
    }
    
    // --- API CALL FUNCTIONS ---
    async function fetchMerits() {
        const nace_id = 0;
        const endpoint = `rules_user_s_merits`;
        try {
            const credentials = await new Promise(resolve => {
                chrome.storage.sync.get(['rovasApiKey', 'rovasToken'], result => resolve(result));
            });
            if (!credentials.rovasApiKey || !credentials.rovasToken) return 'N/A';
            const response = await fetch(`${ROVAS_API_BASE_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "API-KEY": credentials.rovasApiKey,
                    "TOKEN": credentials.rovasToken
                },
                body: JSON.stringify({ nace_id })
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`DEBUG: HTTP error! Status: ${response.status}, Response:`, errorText);
                return 'Error';
            }
            const data = await response.json();
            if (data && data.total_merits !== undefined) return parseFloat(data.total_merits).toFixed(2);
            else {
                console.error("DEBUG: Unexpected response format for Merits API.", data);
                return 'Error';
            }
        } catch (error) {
            console.error("DEBUG: Error in fetch operation for Merits:", error);
            return 'N/A';
        }
    }

    async function fetchChrons() {
        const endpoint = 'rules_users_chrons';
        try {
            const credentials = await new Promise(resolve => {
                chrome.storage.sync.get(['rovasApiKey', 'rovasToken'], result => resolve(result));
            });
            if (!credentials.rovasApiKey || !credentials.rovasToken) return 'N/A';
            const response = await fetch(`${ROVAS_API_BASE_URL}${endpoint}`, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "API-KEY": credentials.rovasApiKey,
                    "TOKEN": credentials.rovasToken
                },
                body: JSON.stringify({})
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`DEBUG: HTTP error! Status: ${response.status}, Response: ${errorText}`);
                return "Error";
            }
            const data = await response.json();
            if (data && data.total_chrons !== undefined) return parseFloat(data.total_chrons).toFixed(2);
            else {
                console.error("DEBUG: Unexpected response format for Chrons API.", data);
                return "Error";
            }
        } catch (error) {
            console.error("DEBUG: Error in fetch operation for Chrons:", error);
            return "N/A";
        }
    }

    async function fetchVerifications() {
        try {
            const credentials = await new Promise(resolve => {
                chrome.storage.sync.get(['rovasApiKey', 'rovasToken'], result => resolve(result));
            });
            if (!credentials.rovasApiKey || !credentials.rovasToken) return { status: 'error', data: 'N/A' };
            const response = await fetch(ROVAS_VERIFICATIONS_URL, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "API-KEY": credentials.rovasApiKey,
                    "TOKEN": credentials.rovasToken
                }
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`DEBUG: HTTP error! Status: ${response.status}, Response: ${errorText}`);
                return { status: 'error', data: `HTTP error! Status: ${response.status}` };
            }
            const data = await response.json();
            return { status: 'success', data: data };
        } catch (error) {
            console.error("DEBUG: Error fetching verifications:", error);
            return { status: 'error', data: 'N/A' };
        }
    }
    
    // --- END API CALL FUNCTIONS ---

    // Helper function to render the verifications list
    function renderVerifications(verifications) {
        const t = getT();
        verificationsListEl.innerHTML = '';
        if (verifications && verifications.length > 0) {
            verificationsStatusEl.style.display = 'none';
            verifications.forEach(report => {
                const li = document.createElement('li');
                const link = document.createElement('a');
                link.textContent = `${t.report_id || 'Report'}: ${report.report_nid} - ${report.report_title} (${report.verify_date_formatted})`;
                link.href = report.report_url;
                link.target = "_blank";
                li.appendChild(link);
                verificationsListEl.appendChild(li);
            });
        } else {
            verificationsStatusEl.style.display = 'block';
            verificationsStatusEl.textContent = t.no_reports_to_validate || 'No reports to validate.';
        }
    }

    // Function to update the new stats section
    async function updateRovasStats() {
        commentNotices.refresh();
        const t = getT();
        meritsEl.textContent = t.loading_data || 'Loading...';
        chronsEl.textContent = t.loading_data || 'Loading...';
        verificationsStatusEl.textContent = t.loading_reports || 'Loading reports...';
        verificationsListEl.innerHTML = '';
        verificationsStatusEl.style.display = 'block';
        
        const [merits, chrons, verificationsResult] = await Promise.all([
            fetchMerits(),
            fetchChrons(),
            fetchVerifications()
        ]);
        
        meritsEl.textContent = merits;
        chronsEl.textContent = chrons;
        
        if (verificationsResult.status === 'success' && verificationsResult.data && verificationsResult.data.verifications) {
            const verifications = verificationsResult.data.verifications;
            renderVerifications(verifications);
        } else {
            verificationsStatusEl.textContent = t.verifications_error || "Error fetching reports.";
            verificationsListEl.innerHTML = '';
        }
    }
    
    // Listen for changes in the input fields
    apiKeyInput.addEventListener('input', () => {
        saveTempCreds();
        updateTempState();
    });
    tokenInput.addEventListener('input', () => {
        saveTempCreds();
        updateTempState();
    });

    // Event listener for the "Open Rovas" button
    rovasPageBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://rovas.app/openstreetmap' });
    });

    // Event listener for the "Save Credentials" button
    saveBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const token = tokenInput.value.trim();
        const t = getT();
        
        if (apiKey && token) {
            chrome.storage.sync.set({ rovasApiKey: apiKey, rovasToken: token }, () => {
                configStatus.textContent = t.status_credentials_saved || 'Credentials saved successfully!';
                configStatus.style.color = 'green';
                setTimeout(() => { configStatus.textContent = ''; }, 3000);
                clearTempCreds();
                tempBanner.style.display = 'none';
                updateRovasStats();
            });
        } else {
            configStatus.textContent = t.status_credentials_error || 'Please enter both API Key and Token.';
            configStatus.style.color = 'red';
        }
    });

    // event listener for checkbox
    companyWorkCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({ isCompanyWork: companyWorkCheckbox.checked }, () => {
        });
        const t = getT();
        if (!companyWorkCheckbox.checked) {
            configStatus.textContent = t.status_company_work_error || 'This plugin is not allowed for use if you are paid by a company for work performed on iD.';
            configStatus.style.color = 'red';
        } else {
            configStatus.textContent = '';
            configStatus.style.color = 'green';
        }
        updateTempState();
    });

    async function getAvailableLocales() {
        try {
            const res = await fetch(chrome.runtime.getURL('locales/languages.json'));
            const manifest = await res.json();
            if (manifest && Array.isArray(manifest.locales)) {
                return manifest.locales;
            }
        } catch (e) {}
        return ['en'];
    }

    async function getPreferredLanguage(callback) {
        const locales = await getAvailableLocales();
        chrome.storage.sync.get(['userLang'], (result) => {
            if (result.userLang && locales.includes(result.userLang)) {
                callback(result.userLang, locales);
            } else {
                const browserLang = navigator.language.split('-')[0];
                callback(locales.includes(browserLang) ? browserLang : locales[0], locales);
            }
        });
    }

    function populateLanguageSelector(currentLang, translations, locales) {
        const langSelect = document.getElementById('langSelect');
        langSelect.innerHTML = '';
        locales.forEach(code => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.id = 'langOpt_' + code;
            opt.textContent = translations['lang_' + code] || code;
            if (code === currentLang) opt.selected = true;
            langSelect.appendChild(opt);
        });
    }

	function updateUIText(t, locales, currentLang = langSelect.value) {
		const manifest = chrome.runtime.getManifest();
		const version = manifest.version;

		document.getElementById('titleText').textContent = `${t.title} v${version}`;
		document.getElementById('noteText').textContent = t.note;
		document.getElementById('infoText').textContent = t.info;
		document.getElementById('rovasPageBtn').textContent = t.open_rovas;
		feeText.textContent = t.fee_text;
		document.getElementById('apiCredsTitle').textContent = t.api_creds_title;
		document.getElementById('apiKeyLabel').textContent = t.api_key_label;
		document.getElementById('tokenLabel').textContent = t.token_label;
		document.getElementById('saveBtn').textContent = t.save;
		document.getElementById('apiKey').placeholder = t.api_key_placeholder;
		document.getElementById('token').placeholder = t.token_placeholder;
		companyWorkLabel.textContent = t.company_work_checkbox;
		document.getElementById('langLabel').textContent = t.language_label;
		populateLanguageSelector(currentLang, t, locales);
		lastTranslations = t;
		activeLanguage = currentLang;
		commentNotices.render();
		document.getElementById('notificationDiagnosticsTitle').textContent = t.notification_diagnostics_title;
		document.getElementById('notificationDiagnosticsInfo').textContent = t.notification_diagnostics_info;
		checkNotificationsBtn.textContent = t.notification_diagnostics_check;
		notificationDiagnosticsOutputLabel.textContent = t.notification_diagnostics_output;
		renderDiagnosticStatus();
		updateTempState();
		
		document.getElementById('userStatsTitle').textContent = t.user_stats_title || 'Rovas User Stats 📊';
		meritsScoreText.textContent = t.merits_score_text || 'Merits: ';
		chronsScoreText.textContent = t.chrons_score_text || 'Chrons: ';
		reportsToValidateTitle.textContent = t.reports_to_validate_title || 'Reports to Validate 📝';
	}

    langSelect.addEventListener('change', () => {
        const selectedLang = langSelect.value;
        chrome.storage.sync.set({ userLang: selectedLang }, () => {
            fetch(`locales/${selectedLang}.json`)
                .then(res => res.json())
                .then(t => getAvailableLocales().then(locales => updateUIText(t, locales)));
        });
    });

    getPreferredLanguage((lang, locales) => {
        langSelect.value = lang;
        fetch(`locales/${lang}.json`)
            .then(res => res.json())
            .then(t => updateUIText(t, locales, lang));
    });

    loadTempCreds();
});
