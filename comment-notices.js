globalThis.RovasCommentNotices = (() => {
    function parse(payload) {
        if (!payload || payload.status !== 'success' || !Array.isArray(payload.notices)) {
            throw new Error('Invalid notification response');
        }
        const seen = new Set();
        return payload.notices.map(item => {
            const nid = Number(item.nid), cid = Number(item.cid), created = Number(item.created);
            if (!Number.isSafeInteger(nid) || nid <= 0 || !Number.isSafeInteger(cid) || cid <= 0 ||
                !Number.isFinite(created) || created < 0 || !Number.isFinite(new Date(created * 1000).getTime()) ||
                typeof item.node_title !== 'string') throw new Error('Invalid notification');
            const url = new URL(item.comment_url);
            if (url.origin !== 'https://rovas.app' || url.username || url.password ||
                url.pathname !== `/comment/${cid}`) throw new Error('Invalid comment URL');
            return { key: `${nid}:${cid}`, nid, cid, title: item.node_title,
                url: `https://rovas.app/comment/${cid}`, created };
        }).filter(item => {
            if (seen.has(item.key)) return false;
            seen.add(item.key);
            return true;
        }).sort((a, b) => b.created - a.created);
    }

    // Account-specific storage namespace without storing a second copy of the API key.
    async function storageKey(apiKey) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
        return 'rovasHiddenCommentNotices:' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    }

    function visible(notices, hidden) {
        const keys = new Set(hidden);
        return notices.filter(item => !keys.has(item.key));
    }

    function createPanel(getTranslations, getLanguage) {
        const list = document.getElementById('comment-notices-list');
        const status = document.getElementById('commentNoticesStatus');
        const restoreButton = document.getElementById('restoreCommentNotices');
        const fallback = {
            comment_notices_title: 'New comments',
            comment_notices_restore: 'Show hidden notifications', comment_notices_loading: 'Loading comments...',
            comment_notices_empty: 'No new comments.', comment_notices_error: 'Unable to load comment notifications.',
            comment_notices_credentials: 'Save your Rovas credentials to view notifications.',
            comment_notices_open: 'Open comment', comment_notices_hide: 'Hide in extension',
            comment_notices_hide_hint: 'Hides only this notification in this browser. New comments on the report will appear again.',
            comment_notices_storage_error: 'Unable to save hidden notifications. Please try again.'
        };
        const t = key => getTranslations()[key] || fallback[key];
        let notices = [], hidden = [], accountKey = null, state = 'loading', saveError = false;
        let generation = 0;

        function render() {
            document.getElementById('commentNoticesTitle').textContent = t('comment_notices_title');
            restoreButton.textContent = t('comment_notices_restore');
            restoreButton.hidden = !accountKey || !hidden.length || state !== 'ready';
            list.replaceChildren();
            const entries = state === 'ready' ? visible(notices, hidden) : [];
            document.getElementById('commentNoticesCount').textContent = state === 'ready' ? ` (${entries.length})` : '';
            status.textContent = saveError ? t('comment_notices_storage_error') : state === 'ready'
                ? (entries.length ? '' : t('comment_notices_empty')) : t('comment_notices_' + state);
            status.hidden = !status.textContent;
            for (const notice of entries) {
                const li = document.createElement('li');
                const open = document.createElement('a');
                open.textContent = `${notice.title || 'Report'} (#${notice.nid})`;
                open.title = `${t('comment_notices_open')}: ${open.textContent} — ${new Date(notice.created * 1000).toLocaleString(getLanguage())}`;
                open.href = notice.url;
                open.target = '_blank';
                open.rel = 'noopener noreferrer';
                // Opening the report/comment clears the notice on Rovas (server behavior).
                // Do not hide locally on click: navigation or sign-in may fail.
                const hide = document.createElement('button');
                hide.type = 'button';
                hide.textContent = '×';
                hide.setAttribute('aria-label', t('comment_notices_hide'));
                hide.title = `${t('comment_notices_hide')}. ${t('comment_notices_hide_hint')}`;
                hide.addEventListener('click', () => saveHidden([...hidden.filter(key => key !== notice.key), notice.key].slice(-500)));
                li.append(open, hide);
                list.appendChild(li);
            }
        }

        async function saveHidden(next) {
            const key = accountKey, requestGeneration = generation;
            if (!key) return;
            restoreButton.disabled = true;
            list.querySelectorAll('button').forEach(button => { button.disabled = true; });
            try {
                await new Promise((resolve, reject) => chrome.storage.local.set({ [key]: next }, () => {
                    if (chrome.runtime.lastError) reject(new Error('Storage failed'));
                    else resolve();
                }));
                if (requestGeneration !== generation) return;
                hidden = next;
                saveError = false;
            } catch (error) {
                if (requestGeneration === generation) saveError = true;
            } finally {
                if (requestGeneration === generation) {
                    restoreButton.disabled = false;
                    render();
                }
            }
        }

        async function refresh() {
            const requestGeneration = ++generation;
            state = 'loading'; saveError = false; accountKey = null; hidden = []; notices = [];
            restoreButton.disabled = true;
            render();
            try {
                const credentials = await new Promise(resolve => chrome.storage.sync.get(['rovasApiKey', 'rovasToken'], resolve));
                const result = await RovasNotificationDiagnostics.inspect(credentials);
                if (requestGeneration !== generation) return;
                if (result.outcome === 'missing_credentials') state = 'credentials';
                else if (result.outcome !== 'success') state = 'error';
                else {
                    const received = parse(result.result.response);
                    const key = await storageKey(credentials.rovasApiKey);
                    const stored = await new Promise((resolve, reject) => chrome.storage.local.get([key], value => {
                        if (chrome.runtime.lastError) reject(new Error('Storage failed'));
                        else resolve(value);
                    }));
                    if (requestGeneration !== generation) return;
                    accountKey = key;
                    hidden = Array.isArray(stored[key]) ? stored[key].filter(value => typeof value === 'string') : [];
                    notices = received;
                    state = 'ready';
                }
            } catch (error) {
                if (requestGeneration === generation) state = 'error';
            } finally {
                if (requestGeneration === generation) {
                    restoreButton.disabled = false;
                    render();
                }
            }
        }

        restoreButton.addEventListener('click', () => saveHidden([]));
        return { refresh, render };
    }

    return { parse, storageKey, visible, createPanel };
})();
