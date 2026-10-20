// Fetch pending Rovas comment notifications for the popup.
// Credentials and sensitive fields echoed by the server are redacted.
globalThis.RovasCommentApi = (() => {
    const endpoint = 'https://rovas.app/rovas/rovas_comment_notices.json';

    function sanitize(value, secrets) {
        const redact = text => secrets.filter(Boolean).reduce((result, secret) => {
            for (const variant of [secret, encodeURIComponent(secret)]) {
                result = result.split(variant).join('[REDACTED]');
            }
            return result;
        }, text);
        if (Array.isArray(value)) return value.map(item => sanitize(item, secrets));
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([key, item]) => [
                redact(key),
                /api.?key|token|authorization|password|secret|cookie/i.test(key)
                    ? '[REDACTED]' : sanitize(item, secrets)
            ]));
        }
        return typeof value === 'string' ? redact(value) : value;
    }

    async function fetchPending(credentials, fetcher = fetch) {
        if (!credentials.rovasApiKey || !credentials.rovasToken) {
            return { outcome: 'missing_credentials' };
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetcher(endpoint, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'API-KEY': credentials.rovasApiKey,
                    TOKEN: credentials.rovasToken
                },
                credentials: 'omit',
                cache: 'no-store',
                redirect: 'error',
                signal: controller.signal
            });
            const result = {
                endpoint,
                http_status: response.status,
                ok: response.ok,
                content_type: response.headers.get('content-type') || ''
            };
            const body = await response.text();
            try {
                // Also sanitize JSON keys and any credentials echoed in the response.
                result.response = sanitize(JSON.parse(body), [credentials.rovasApiKey, credentials.rovasToken]);
                return { outcome: response.ok ? 'success' : 'http_error', result };
            } catch (error) {
                if (controller.signal.aborted) throw error;
                // HTML error/login pages are not useful for discovering the JSON contract.
                return { outcome: 'not_json', result };
            }
        } catch (error) {
            // Do not expose error messages that could contain request details.
            return { outcome: controller.signal.aborted ? 'timeout' : 'network_error' };
        } finally {
            clearTimeout(timeout);
        }
    }

    return { fetchPending };
})();
