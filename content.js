// content.js
console.log("[ROVAS] iD script started");

// Declare variables for API Key and Token.
// These will be populated from Chrome storage.
let ROVAS_API_KEY = null;
let ROVAS_TOKEN = null;

let intervalId = null;
let startTime = null;
let timerText = null;
let latestChangesetId = null; // Variable to store the last detected changeset ID
let isPaused = false;
let pausedDuration = 0;
let pauseStartTime = null;

// --- Localization support ---
let translations = {};
let userLang = 'en';

async function getPreferredLanguage() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['userLang'], (result) => {
            if (result.userLang) {
                resolve(result.userLang);
            } else {
                const browserLang = navigator.language.split('-')[0];
                const supported = ['en', 'hu', 'sk'];
                resolve(supported.includes(browserLang) ? browserLang : 'en');
            }
        });
    });
}

async function loadTranslations() {
    userLang = await getPreferredLanguage();
    try {
        const res = await fetch(chrome.runtime.getURL(`locales/${userLang}.json`));
        translations = await res.json();
    } catch (e) {
        translations = {};
    }
}

function t(key, vars = {}) {
    let str = translations[key] || key;
    Object.keys(vars).forEach(k => {
        str = str.replace(new RegExp(`{${k}}`, 'g'), vars[k]);
    });
    return str;
}

// Function to load Rovas credentials from Chrome storage
async function loadRovasCredentials() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['rovasApiKey', 'rovasToken'], (result) => {
            ROVAS_API_KEY = result.rovasApiKey || null;
            ROVAS_TOKEN = result.rovasToken || null;
            if (!ROVAS_API_KEY || !ROVAS_TOKEN) {
                console.warn("[ROVAS] API Key or Token not found in storage. Please configure them in the extension popup.");
            }
            resolve();
        });
    });
}

// --- Event listener for browser tab visibility ---
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        if (!isPaused && intervalId) {
            console.log("[ROVAS] Browser hidden: session paused.");
            pauseSession();
        }
    } else {
        if (isPaused) {
            console.log("[ROVAS] Browser visible: session activated.");
            startSession();
        }
    }
});

// --- Patch createTimerBadge and all alerts to use translations ---
async function createTimerBadge() {
    if (document.getElementById("rovas-timer-badge")) return;
    await loadTranslations();

    // Check if credentials are available before creating the badge
    await loadRovasCredentials();
    if (!ROVAS_API_KEY || !ROVAS_TOKEN) {
        console.log("[ROVAS] No API credentials found. Timer badge not created.");
        return;
    }

    const badge = document.createElement("div");
    badge.id = "rovas-timer-badge";
    badge.style.position = "fixed";
    badge.style.bottom = "20px";
    badge.style.right = "20px";
    badge.style.padding = "8px 12px";
    badge.style.backgroundColor = "#323232";
    badge.style.color = "#fff";
    badge.style.fontSize = "14px";
    badge.style.fontFamily = "monospace";
    badge.style.borderRadius = "8px";
    badge.style.zIndex = "9999";
    badge.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
    badge.style.display = "flex";
    badge.style.alignItems = "center";
    badge.style.gap = "10px";

    timerText = document.createElement("span");
    timerText.textContent = "🕒 0m 0s";

    const stopBtn = document.createElement("button");
    stopBtn.textContent = t('stop');
    stopBtn.id = "rovas-stop-btn";
    stopBtn.style.cursor = "pointer";
    stopBtn.onclick = stopSession;

    const startBtn = document.createElement("button");
    startBtn.textContent = t('start');
    startBtn.id = "rovas-start-btn";
    startBtn.style.cursor = "pointer";
    startBtn.onclick = startSession;

    const pauseBtn = document.createElement("button");
    pauseBtn.textContent = t('pause');
    pauseBtn.id = "rovas-pause-btn";
    pauseBtn.style.cursor = "pointer";
    pauseBtn.onclick = pauseSession;

    badge.appendChild(timerText);
    badge.appendChild(startBtn);
    badge.appendChild(pauseBtn);
    badge.appendChild(stopBtn);

    document.body.appendChild(badge);
    startSession(); // Automatically starts the timer at the beginning of mapping session
}

function startSession() {
    if (intervalId && !isPaused) return;

    if (isPaused) {
        pausedDuration += (new Date() - pauseStartTime);
        isPaused = false;
        pauseStartTime = null;
    } else {
        startTime = new Date();
        pausedDuration = 0;
        latestChangesetId = null; // Resets ID when a new session is started
    }

    updateTimerText(new Date() - startTime - pausedDuration);

    intervalId = setInterval(() => {
        const now = new Date();
        updateTimerText(now - startTime - pausedDuration);
    }, 1000);

    setButtonsState('running');
    console.log("[ROVAS] Session started/resumed.");
}

function pauseSession() {
    if (!intervalId && !isPaused) return;

    clearInterval(intervalId);
    intervalId = null;
    isPaused = true;
    pauseStartTime = new Date();
    
    setButtonsState('paused');
    console.log("[ROVAS] Session paused.");
}

function stopSession() {
    if (!intervalId && !isPaused) return;

    clearInterval(intervalId);
    intervalId = null;
    isPaused = false;
    pauseStartTime = null;
    pausedDuration = 0;
    latestChangesetId = null;
    updateTimerText(0);
    setButtonsState('stopped');
    console.log("[ROVAS] Timer stopped.");
    alert(t('alert_session_stopped'));
}

function updateTimerText(diffMs) {
    if (isNaN(diffMs) || diffMs < 0) diffMs = 0;
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    timerText.textContent = `🕒 ${minutes}m ${seconds}s`;
}

function resetTimer() {
    clearInterval(intervalId);
    intervalId = null;
    startTime = null;
    pausedDuration = 0;
    isPaused = false;
    pauseStartTime = null;
    latestChangesetId = null;
    updateTimerText(0);
    setButtonsState('stopped');
    console.log("[ROVAS] Timer reset.");
}

function setButtonsState(state) {
    const badge = document.getElementById("rovas-timer-badge");
    if (!badge) return;

    const startBtn = badge.querySelector("#rovas-start-btn");
    const pauseBtn = badge.querySelector("#rovas-pause-btn");
    const stopBtn = badge.querySelector("#rovas-stop-btn");

    switch (state) {
        case 'running':
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
            break;
        case 'paused':
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = false;
            break;
        case 'stopped':
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
            break;
    }
}

function getProjectID(siteName) {
    // Fixed project ID for OpenStreetMap/OpenHistoricalMap on Rovas: hardcoded
    const ROVAS_OSM_PROJECT_ID = 1998;
    const ROVAS_OHM_PROJECT_ID = 518464;

    return siteName === "OpenStreetMap" ? ROVAS_OSM_PROJECT_ID : ROVAS_OHM_PROJECT_ID;
}

// works in a similar way to fetch(), but runs in the background script
function fetchFromBackground(site, payload) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage(
            {
                contentScriptQuery: 'fetchUrl',
                site: site,
                payload: payload
            },
            response => {
                resolve(response);
            }
        );
    });
}

function fetchChangesetComment(changesetId, callback, siteName) {
    // resolves to openstreetmap or openhistoricalmap
    const changesetSite = siteName === "OpenStreetMap" 
        ? `https://api.openstreetmap.org/api/0.6/changeset/${changesetId}` 
        : `https://api.openhistoricalmap.org/api/0.6/changeset/${changesetId}`;  
        // OHM does not currently work because OHM API has cloudflare... to test against bots... on its API... no clue why

    fetchFromBackground(changesetSite)  
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(response.text, "application/xml");
            const commentTag = xmlDoc.querySelector("changeset tag[k='comment']");
            const comment = commentTag ? commentTag.getAttribute("v") : "";
            callback(null, comment);
        })
        .catch(err => {
            callback(err);
        });
}



// Function to check if the user is a project shareholder
async function checkOrCreateShareholder(siteName) {
    await loadRovasCredentials(); 

    if (!ROVAS_API_KEY || !ROVAS_TOKEN) {
        console.error("[ROVAS] Cannot perform shareholder check: ROVAS API Key or Token is missing.");
        alert(t('alert_missing_credentials'));
        return null;
    }

    console.log(`%c[ROVAS] Attempting to verify/add project shareholding...`, 'color: #8A2BE2; font-weight: bold;');

    const payload = {
        project_id: getProjectID(siteName),
    };

    try {
        const response = await fetchFromBackground("https://rovas.app/rovas/rules/rules_proxy_check_or_add_shareholder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "API-KEY": ROVAS_API_KEY, // Uses the loaded key
                "TOKEN": ROVAS_TOKEN      // Uses the loaded token
            },
            body: JSON.stringify(payload)
        });

        const textResponse = response.text;

        if (!response.ok) {
            // If the response is not OK, throw an error with the response text for debugging.
            throw new Error(`Server error ${response.status}: ${textResponse}`);
        }

        // Debug: Log the actual response
        console.log(`%c[ROVAS] Shareholder check response: "${textResponse}"`, 'color: #FFA500; font-weight: bold;');

        // Check for invalid API keys response.
        if (textResponse.includes("The API keys sent are invalid")) {
            console.error("[ROVAS] Invalid API keys detected:", textResponse);
            alert(t('alert_invalid_credentials'));
            return null;
        }

        // Parse response as JSON (new format) or fallback to text parsing (old format)
        let shareholderNid = null;
        try {
            // Try to parse as JSON first
            const jsonResponse = JSON.parse(textResponse);
            if (jsonResponse.result) {
                shareholderNid = jsonResponse.result;
            }
        } catch (e) {
            // If JSON parsing fails, try the old text format
            const match = textResponse.match(/result:\s*(\d+)/);
            if (match && match[1]) {
                shareholderNid = match[1];
            }
        }

        if (shareholderNid) {
            if (parseInt(shareholderNid, 10) > 0) {
                console.log(`%c[ROVAS] ${siteName} project shareholding (Shareholder NID): ${shareholderNid} confirmed.`, 'color: #00FF7F; font-weight: bold;');
                return shareholderNid;
            } else {
                console.warn(`%c[ROVAS] Project participation returned invalid ID (0 or negative): ${shareholderNid}.`, 'color: #FF4500; font-weight: bold;');
                throw new Error(`Invalid project participation ID: ${shareholderNid}. Please check your Rovas account.`);
            }
        } else {
            console.warn("[ROVAS] 'check_or_add_shareholder' response has no valid NID:", textResponse);
            throw new Error("Unable to get shareholder NID from the response.");
        }

    } catch (error) {
        console.error("[ROVAS] Error in checkOrCreateShareholder:", error);
        alert(t('alert_shareholder_error'));
        return null;
    }
}

// --- Function to automatically send the payload with confirm request ---
async function sendRovasReport(changesetId, siteName) {
    await loadRovasCredentials(); 

    // Stop if credentials are not available
    if (!ROVAS_API_KEY || !ROVAS_TOKEN) {
        console.error("[ROVAS] Cannot proceed: ROVAS API Key or Token is missing. Please configure them in the extension popup.");
        alert(t('alert_missing_credentials'));
        resetTimer();
        startSession();
        return;
    }

    if (!startTime) {
        console.warn("[ROVAS] Attempting to send report without timer started.");
        alert(t('alert_timer_not_active'));
        return;
    }

    // We check that timer is stopped and reset before proceeding
    clearInterval(intervalId);
    intervalId = null;
    isPaused = false;
    pauseStartTime = null;

    const endTime = new Date();
    const actualDurationMs = (endTime - startTime) - pausedDuration;
    const initialMinutes = (actualDurationMs / 60000).toFixed(2);
    const totalSeconds = Math.floor(actualDurationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const initialFormattedDuration = `${hours}h ${minutes}m ${seconds}s`;

    if (actualDurationMs <= 10) {
        alert(t('alert_duration_short'));
        resetTimer();
        startSession();
        return;
    }	

    console.log(`%c[ROVAS] Detected ${siteName} ID ${changesetId}, preparing for automatic upload. Effective duration: ${actualDurationMs}ms`, 'color: #FFA500; font-weight: bold;');

    // We get changeset comment
    let comment = "";
    try {
        comment = await new Promise((resolve, reject) => {
            fetchChangesetComment(changesetId, (err, cmt) => {
                if (err) reject(err);
                else resolve(cmt);
            }, siteName);
        });
    } catch (error) {
        console.error("[ROVAS] Error in getting the comment:", error);
        alert(t('alert_comment_error'));
    }

    // Check if the user is a shareholder of the project
    let shareholderNid = null;
    console.log("[ROVAS] Automatically checking/registering Rovas project participation...");
    shareholderNid = await checkOrCreateShareholder();

    if (!shareholderNid) {
        alert(t('alert_shareholder_error'));
        resetTimer();
        startSession();
        return;
    }

    const proofOSM = `https://overpass-api.de/achavi/?changeset=${changesetId}`;
    const proofOHM = `https://www.openhistoricalmap.org/changeset/${changesetId}`;
    

    const rovasPayload = {
        wr_classification: 1645,
        wr_description: comment || `Made edits to the ${siteName} project using the iD editor. This report was created automatically by the browser extension.`,
        wr_activity_name: "Creating map data with iD",
        wr_hours: Math.max(0.01, (actualDurationMs / 3600000).toFixed(2)),
        wr_web_address: siteName === "OpenStreetMap" ? proofOSM : proofOHM,
        parent_project_nid: getProjectID(siteName),
        date_started: Math.floor(startTime.getTime() / 1000),
        access_token: Math.random().toString(36).substring(2, 18),
        publish_status: 1
    };
    
    try {
        let userMinutes = null;
        let validInput = false;

        // Loop to enter a valid value or cancel
        while (!validInput) {
            const userConfirmation = prompt(
                t('confirm_submit_report_prompt', {
                    id: changesetId,
                    duration_hms: initialFormattedDuration,
                    duration_decimal: initialMinutes
                }),
                userMinutes !== null ? userMinutes : initialMinutes
            );

            if (userConfirmation === null) {
                console.log("[ROVAS] Submission to Rovas cancelled by user.");
                alert(t('alert_report_cancelled'));
                resetTimer();
                startSession();
                return;
            }

            userMinutes = parseFloat(userConfirmation);

            if (isNaN(userMinutes) || userMinutes <= 0) {
                alert(t('alert_invalid_duration'));
            } else if (userMinutes > initialMinutes) {
                alert(t('alert_duration_too_high'));
            } else {
                validInput = true;
            }
        }

        // input is valid, we can upload
        const finalHours = Math.max(0.01, (userMinutes / 60).toFixed(2));
        rovasPayload.wr_hours = finalHours;

        console.log("[ROVAS] Submitting report with the modified duration.");
        
        const response = await fetchFromBackground("https://rovas.app/rovas/rules/rules_proxy_create_work_report", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "API-KEY": ROVAS_API_KEY,
                "TOKEN": ROVAS_TOKEN
            },
            body: JSON.stringify(rovasPayload)
        });

        const textResponse = response.text;

        if (!response.ok) {
            throw new Error(`Server error ${response.status}: ${textResponse}`);
        }

        let rovasReportId;
        try {
            const parsed = JSON.parse(textResponse);
            rovasReportId = parsed.created_wr_nid;
        } catch (e) {
            console.warn("[ROVAS] Failed to parse JSON response:", e, textResponse);
        }

        if (rovasReportId) {
            console.log(`[ROVAS] Report submitted automatically successfully. Rovas ID: ${rovasReportId}`);
            alert(t('alert_report_success', {id: rovasReportId}));
            chargeUsageFee(rovasReportId, finalHours);
        } else {
            alert(t('alert_report_id_missing'));
        }

    } catch (error) {
        console.error("[ROVAS] Error during report processing:", error);
        alert(t('alert_report_error', {error: error.message}));
    } finally {
        resetTimer();
        startSession();
    }
}

// --- Function to charge usage fee after successful work report ---
// --- IN RESPECT OF DEVELOPERS, THIS SHALL NOT BE REMOVED IF THIS EXTENSION IS FORKED ---
async function chargeUsageFee(wrId, laborHours) {
    console.log(`%c[ROVAS] Charging usage fee for work report ID: ${wrId}`, 'color: #FFD700; font-weight: bold;');
    
    // Calculate usage fee: 3% of (labor time * 10)
    const laborValue = laborHours * 10;
    const usageFee = Number((laborValue * 0.03).toFixed(2));
    
    const feePayload = {
        project_id: 429681, // project "Rovas Connector for ID"
        wr_id: wrId,
        usage_fee: usageFee,
        note: "3% usage fee, levied by the 'Rovas Connector for ID' project"
    };

    try {
        const response = await fetchFromBackground("https://rovas.app/rovas/rules/rules_proxy_create_aur", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "API-KEY": ROVAS_API_KEY,
                "TOKEN": ROVAS_TOKEN
            },
            body: JSON.stringify(feePayload)
        });

        const textResponse = response.text;

        if (!response.ok) {
            console.warn(`[ROVAS] Usage fee charge failed with status ${response.status}: ${textResponse}`);
            return false;
        }

        console.log(`%c[ROVAS] Usage fee charged successfully for work report ID: ${wrId} (fee: ${usageFee.toFixed(2)})`, 'color: #00FF7F; font-weight: bold;');
        return true;
    } catch (error) {
        console.error("[ROVAS] Error charging usage fee:", error);
        return false;
    }
}

// Listener for messages from the Background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "CHANGESET_ID_DETECTED") {
        // IMPORTANT: we need to be sure it does not activate more times for the same ID
        if (latestChangesetId === request.changesetId) {
            console.log(`%c[ROVAS Content] ID ${request.changesetId} already processed, ignored.`, 'color: gray;');
            return;
        }

        latestChangesetId = request.changesetId;
        console.log(`%c[ROVAS Content] NEW Changeset ID in ${request.siteName} received from background: ${request.changesetId}`, 'color: orange; font-weight: bold;');

        // We call the function to send the report with confirm request
        sendRovasReport(request.changesetId, request.siteName);
    }
});

// --- Listen for language changes and update badge dynamically ---
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.userLang) {
        // Remove the old badge if present
        const badge = document.getElementById("rovas-timer-badge");
        if (badge) badge.remove();
        // Recreate the badge with the new language
        createTimerBadge();
    }
    
    // Listen for credential changes and show/hide timer badge
    if (area === 'sync' && (changes.rovasApiKey || changes.rovasToken)) {
        const badge = document.getElementById("rovas-timer-badge");
        if (badge) badge.remove();
        // Recreate the badge to check if credentials are now available
        createTimerBadge();
    }
});

// We start the badge again after the report sending is done
const url = new URL(window.location.href);
const host = url.hostname;
const pathname = url.pathname;

const isOSEditor = (host === "www.openstreetmap.org" || host === "www.openhistoricalmap.org") && pathname === "/edit";
const isRapidStandalone = host === "rapideditor.org" && pathname === "/edit";

if (isOSEditor || isRapidStandalone) {
    createTimerBadge();
}