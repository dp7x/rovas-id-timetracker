globalThis.RovasNotificationBadge = (() => {
    const ALARM = 'rovas-pending-notifications';
    const PERIOD = 15;
    const fallback = {
        badge_pending: 'Reports to validate: {reports}; new comments: {comments}',
        badge_empty: 'No reports to validate or new comments.',
        badge_credentials: 'Save your Rovas credentials to enable notification checks.',
        badge_error: 'Unable to refresh notifications. The badge keeps the last successful result.'
    };

    function appearance(reports, comments) {
        const total = reports + comments;
        return { text: total ? (total > 99 ? '99+' : String(total)) : '',
            color: comments ? '#c62828' : '#e08000' };
    }

    function create(api = chrome, fetcher = fetch) {
        const name = api.runtime.getManifest().name;
        let running = null, dirty = false, reset = false, revision = 0;

        async function translations(savedLanguage) {
            try {
                const manifest = await (await fetcher(api.runtime.getURL('locales/languages.json'))).json();
                const browserLanguage = api.i18n.getUILanguage().split('-')[0];
                const language = manifest.locales.includes(savedLanguage) ? savedLanguage
                    : manifest.locales.includes(browserLanguage) ? browserLanguage : 'en';
                return { ...fallback, ...await (await fetcher(api.runtime.getURL(`locales/${language}.json`))).json() };
            } catch (error) { return fallback; }
        }

        async function reportsCount(credentials) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            try {
                const response = await fetcher('https://rovas.app/rovas/rovas_verifications.json', {
                    headers: { Accept: 'application/json', 'API-KEY': credentials.rovasApiKey, TOKEN: credentials.rovasToken },
                    credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal
                });
                if (!response.ok) throw new Error('Verification request failed');
                const data = await response.json();
                if (!Array.isArray(data.verifications)) {
                    throw new Error('Invalid verification response');
                }
                return data.verifications.length;
            } finally { clearTimeout(timeout); }
        }

        async function check(version, clearFirst) {
            if (clearFirst) await api.action.setBadgeText({ text: '' });
            const credentials = await api.storage.sync.get(['rovasApiKey', 'rovasToken', 'userLang']);
            const t = await translations(credentials.userLang);
            if (version !== revision) return;
            if (!credentials.rovasApiKey || !credentials.rovasToken) {
                await api.action.setBadgeText({ text: '' });
                await api.action.setTitle({ title: `${name}\n${t.badge_credentials}` });
                return;
            }
            try {
                const [reports, result] = await Promise.all([
                    reportsCount(credentials),
                    RovasCommentApi.fetchPending(credentials, fetcher)
                ]);
                if (result.outcome !== 'success') throw new Error('Comment request failed');
                const comments = RovasCommentNotices.parse(result.result.response).length;
                if (version !== revision) return;
                const badge = appearance(reports, comments);
                await api.action.setBadgeBackgroundColor({ color: badge.color });
                if (api.action.setBadgeTextColor) await api.action.setBadgeTextColor({ color: '#ffffff' });
                await api.action.setBadgeText({ text: badge.text });
                const summary = reports + comments ? t.badge_pending.replace('{reports}', reports).replace('{comments}', comments) : t.badge_empty;
                await api.action.setTitle({ title: `${name}\n${summary}` });
            } catch (error) {
                if (version !== revision) return;
                // An unavailable endpoint must not turn existing pending items into zero.
                await api.action.setTitle({ title: `${name}\n${t.badge_error}` });
            }
        }

        function refresh(clearFirst = false) {
            if (clearFirst) { revision++; reset = true; dirty = true; }
            if (running) return running;
            running = (async () => {
                do {
                    dirty = false;
                    const clear = reset;
                    reset = false;
                    await check(revision, clear);
                } while (dirty);
            })().catch(() => {
                // No raw request data, credentials or response bodies in logs.
                console.warn('[ROVAS] Could not update notification badge.');
            }).finally(() => { running = null; });
            return running;
        }

        async function ensureAlarm() {
            const alarm = await api.alarms.get(ALARM);
            if (!alarm || alarm.periodInMinutes !== PERIOD) {
                await api.alarms.create(ALARM, { periodInMinutes: PERIOD });
                return true;
            }
            return false;
        }

        function start() {
            api.alarms.onAlarm.addListener(alarm => { if (alarm.name === ALARM) refresh(); });
            const startup = () => { ensureAlarm().then(() => refresh()).catch(() => {}); };
            api.runtime.onInstalled.addListener(startup);
            api.runtime.onStartup.addListener(startup);
            api.storage.onChanged.addListener((changes, area) => {
                if (area === 'sync' && ['rovasApiKey', 'rovasToken', 'userLang'].some(key => key in changes)) refresh(true);
            });
            api.runtime.onMessage.addListener((request, sender, respond) => {
                if (request.type !== 'ROVAS_REFRESH_BADGE') return;
                refresh().then(() => respond({ ok: true }));
                return true;
            });
            // Recreate a lost alarm without polling on every service-worker wakeup.
            ensureAlarm().then(created => { if (created) refresh(); }).catch(() => {});
        }

        return { refresh, ensureAlarm, start };
    }

    return { create, appearance, ALARM, PERIOD };
})();
