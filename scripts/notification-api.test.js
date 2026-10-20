const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'notification-api.js'), 'utf8');
function load(overrides = {}) {
    const context = vm.createContext({ AbortController, setTimeout, clearTimeout, fetch, ...overrides });
    vm.runInContext(source, context);
    return context.RovasCommentApi;
}
const credentials = { rovasApiKey: 'test-key-123', rovasToken: 'test/token-456' };
const response = (body, status = 200, type = 'application/json') => ({
    status, ok: status >= 200 && status < 300,
    headers: { get: () => type },
    text: async () => body
});

test('does not request notifications without both saved credentials', async () => {
    for (const creds of [{}, { rovasApiKey: 'key' }, { rovasToken: 'token' }]) {
        const result = await load().fetchPending(creds, () => { throw new Error('Unexpected request'); });
        assert.equal(result.outcome, 'missing_credentials');
    }
});

test('makes exactly one authenticated GET with no cookies or redirect forwarding', async () => {
    let requests = 0;
    const result = await load().fetchPending(credentials, async (url, options) => {
        requests++;
        assert.equal(url, 'https://rovas.app/rovas/rovas_comment_notices.json');
        assert.equal(options.method, 'GET');
        assert.equal(options.headers['API-KEY'], credentials.rovasApiKey);
        assert.equal(options.headers.TOKEN, credentials.rovasToken);
        assert.equal(options.credentials, 'omit');
        assert.equal(options.redirect, 'error');
        assert.equal(options.cache, 'no-store');
        return response('{"notices":[{"comment":"Example","id":123}]}');
    });
    assert.equal(requests, 1);
    assert.equal(result.outcome, 'success');
    assert.equal(result.result.response.notices[0].id, 123);
    assert.equal(result.result.response.notices[0].comment, 'Example');
});

test('redacts sensitive fields and credentials echoed in nested data, keys and URLs', async () => {
    const body = JSON.stringify({
        token: 'another-secret', API_KEY: 'another-key',
        items: [{ message: credentials.rovasApiKey, url: '?t=' + encodeURIComponent(credentials.rovasToken) }],
        [credentials.rovasApiKey]: credentials.rovasToken
    });
    const result = await load().fetchPending(credentials, async () => response(body));
    const output = JSON.stringify(result);
    for (const secret of [...Object.values(credentials), encodeURIComponent(credentials.rovasToken), 'another-secret', 'another-key']) {
        assert.equal(output.includes(secret), false);
    }
    assert.ok(output.includes('[REDACTED]'));
});

test('keeps HTTP failures distinct from an empty successful response', async () => {
    const failure = await load().fetchPending(credentials, async () => response('{"error":"Denied"}', 403));
    assert.equal(failure.outcome, 'http_error');
    assert.equal(failure.result.http_status, 403);
    const empty = await load().fetchPending(credentials, async () => response('[]'));
    assert.equal(empty.outcome, 'success');
    assert.equal(empty.result.response.length, 0);
});

test('does not expose HTML login/error pages', async () => {
    const result = await load().fetchPending(credentials, async () => response('<html>private details</html>', 404, 'text/html'));
    assert.equal(result.outcome, 'not_json');
    assert.equal(result.result.http_status, 404);
    assert.equal(JSON.stringify(result).includes('private details'), false);
});

test('network exceptions do not expose request details', async () => {
    const result = await load().fetchPending(credentials, async () => { throw new Error(credentials.rovasToken); });
    assert.equal(result.outcome, 'network_error');
    assert.equal(JSON.stringify(result).includes(credentials.rovasToken), false);
});

test('aborts slow requests after 15 seconds and clears the timeout', async () => {
    let abort;
    let cleared = false;
    const api = load({
        setTimeout: (callback, ms) => { assert.equal(ms, 15000); abort = callback; return 123; },
        clearTimeout: id => { assert.equal(id, 123); cleared = true; }
    });
    const result = await api.fetchPending(credentials, async (_, options) => {
        abort();
        assert.equal(options.signal.aborted, true);
        throw new Error('Aborted');
    });
    assert.equal(result.outcome, 'timeout');
    assert.equal(cleared, true);
});
