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

    function createPanel(getTranslations, getLanguage) {
        const list = document.getElementById('comment-notices-list');
        const status = document.getElementById('commentNoticesStatus');
        const fallback = {
            comment_notices_title: 'New comments',
            comment_notices_loading: 'Loading comments...',
            comment_notices_empty: 'No new comments.', comment_notices_error: 'Unable to load comment notifications.',
            comment_notices_credentials: 'Save your Rovas credentials to view notifications.',
            comment_notices_open: 'Open comment'
        };
        const t = key => getTranslations()[key] || fallback[key];
        let notices = [], state = 'loading';
        let generation = 0;

        function render() {
            document.getElementById('commentNoticesTitle').textContent = t('comment_notices_title');
            list.replaceChildren();
            const entries = state === 'ready' ? notices : [];
            document.getElementById('commentNoticesCount').textContent = state === 'ready' ? ` (${entries.length})` : '';
            status.textContent = state === 'ready'
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
                li.appendChild(open);
                list.appendChild(li);
            }
        }

        async function refresh() {
            const requestGeneration = ++generation;
            state = 'loading'; notices = [];
            render();
            try {
                const credentials = await new Promise(resolve => chrome.storage.sync.get(['rovasApiKey', 'rovasToken'], resolve));
                const result = await RovasCommentApi.fetchPending(credentials);
                if (requestGeneration !== generation) return;
                if (result.outcome === 'missing_credentials') state = 'credentials';
                else if (result.outcome !== 'success') state = 'error';
                else {
                    notices = parse(result.result.response);
                    state = 'ready';
                }
            } catch (error) {
                if (requestGeneration === generation) state = 'error';
            } finally {
                if (requestGeneration === generation) {
                    render();
                }
            }
        }

        return { refresh, render };
    }

    return { parse, createPanel };
})();
