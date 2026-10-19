const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '..', 'comment-notices.js'), 'utf8');
const sample = { nid: 579779, node_title: 'Creating map data with iD', cid: 636,
    comment_url: 'https://rovas.app/comment/636', created: 1792429580 };
const payload = notices => ({ status: 'success', count: notices.length, notices });
function load(extra = {}) {
    const context = vm.createContext({ URL, crypto: webcrypto, TextEncoder, ...extra });
    vm.runInContext(source, context);
    return context.RovasCommentNotices;
}

test('parses the real production response and supports an empty list', () => {
    const api = load();
    const [notice] = api.parse(payload([sample]));
    assert.equal(notice.key, '579779:636');
    assert.equal(notice.title, sample.node_title);
    assert.equal(notice.url, sample.comment_url);
    assert.equal(notice.created, 1792429580);
    assert.equal(api.parse(payload([])).length, 0);
});

test('rejects malformed/API-error payloads and unsafe or mismatched links', () => {
    const api = load();
    for (const body of [{}, { status: 'error', notices: [] }, { status: 'success', notices: {} },
        payload([{ ...sample, cid: -1 }]), payload([{ ...sample, created: 1e99 }])]) {
        assert.throws(() => api.parse(body));
    }
    for (const url of ['javascript:alert(1)', 'https://evil.example/comment/636',
        'https://rovas.app/comment/637', 'https://user:pass@rovas.app/comment/636']) {
        assert.throws(() => api.parse(payload([{ ...sample, comment_url: url }])));
    }
});

test('deduplicates and orders newest first', () => {
    const newer = { ...sample, cid: 637, comment_url: 'https://rovas.app/comment/637', created: sample.created + 60 };
    const result = load().parse(payload([sample, newer, sample]));
    assert.equal(result.length, 2);
    assert.equal(result[0].cid, 637);
});

test('hiding one comment allows the next comment on the same report', () => {
    const api = load();
    const notices = api.parse(payload([sample, { ...sample, cid: 637, comment_url: 'https://rovas.app/comment/637' }]));
    const result = api.visible(notices, ['579779:636']);
    assert.equal(result.length, 1);
    assert.equal(result[0].cid, 637);
});

test('storage is isolated by account without exposing credentials', async () => {
    const api = load();
    assert.equal(await api.storageKey('account-A-key'), await api.storageKey('account-A-key'));
    assert.notEqual(await api.storageKey('account-A-key'), await api.storageKey('account-B-key'));
    assert.equal((await api.storageKey('account-A-key')).includes('account-A-key'), false);
});

class Element {
    constructor() { this.children = []; this.events = {}; this.disabled = false; this.textContent = ''; }
    addEventListener(type, callback) { this.events[type] = callback; }
    setAttribute(name, value) { this[name] = value; }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.children.push(item); }
    replaceChildren() { this.children = []; }
    querySelectorAll() { return this.children.flatMap(item => item.children).filter(item => item.events.click); }
}
function panelFixture() {
    const elements = Object.fromEntries(['comment-notices-list', 'commentNoticesStatus', 'refreshCommentNotices',
        'restoreCommentNotices', 'commentNoticesTitle', 'commentNoticesCount'].map(id => [id, new Element()]));
    const stored = {};
    let credentials = { rovasApiKey: 'account-A-key', rovasToken: 'example-token' };
    let result = { outcome: 'success', result: { response: payload([sample]) } };
    let failSave = false;
    const runtime = {};
    const api = load({
        document: { getElementById: id => elements[id], createElement: () => new Element() },
        chrome: {
            runtime,
            storage: {
                sync: { get: (_, callback) => queueMicrotask(() => callback(credentials)) },
                local: {
                    get: (_, callback) => queueMicrotask(() => callback(stored)),
                    set: (value, callback) => queueMicrotask(() => {
                        if (failSave) runtime.lastError = { message: 'Failed' };
                        else Object.assign(stored, value);
                        callback();
                        delete runtime.lastError;
                    })
                }
            }
        },
        RovasNotificationDiagnostics: { inspect: async () => result }
    });
    return { panel: api.createPanel(() => ({}), () => 'en'), elements, stored,
        setResult: value => { result = value; },
        setCredentials: value => { credentials = value; },
        failSave: () => { failSave = true; } };
}

test('panel hides locally, survives refresh, restores and separates accounts', async () => {
    const f = panelFixture();
    await f.panel.refresh();
    let list = f.elements['comment-notices-list'];
    assert.equal(list.children.length, 1);
    assert.equal(list.children[0].children[0].textContent, 'Creating map data with iD (#579779)');
    await list.children[0].children[1].events.click();
    assert.equal(list.children.length, 0);
    await f.panel.refresh();
    assert.equal(list.children.length, 0);
    f.setCredentials({ rovasApiKey: 'account-B-key', rovasToken: 'example-token' });
    await f.panel.refresh();
    assert.equal(list.children.length, 1);
    f.setCredentials({ rovasApiKey: 'account-A-key', rovasToken: 'example-token' });
    await f.panel.refresh();
    assert.equal(list.children.length, 0);
    await f.elements.restoreCommentNotices.events.click();
    assert.equal(list.children.length, 1);
});

test('panel distinguishes fetch failures, missing credentials and empty success', async () => {
    const f = panelFixture();
    f.setResult({ outcome: 'http_error' });
    await f.panel.refresh();
    assert.equal(f.elements.commentNoticesStatus.textContent, 'Unable to load comment notifications.');
    f.setResult({ outcome: 'missing_credentials' });
    await f.panel.refresh();
    assert.equal(f.elements.commentNoticesStatus.textContent, 'Save your Rovas credentials to view notifications.');
    f.setResult({ outcome: 'success', result: { response: payload([]) } });
    await f.panel.refresh();
    assert.equal(f.elements.commentNoticesStatus.textContent, 'No new comments.');
});

test('failed local save leaves the notification visible', async () => {
    const f = panelFixture();
    await f.panel.refresh();
    f.failSave();
    await f.elements['comment-notices-list'].children[0].children[1].events.click();
    assert.equal(f.elements['comment-notices-list'].children.length, 1);
    assert.equal(f.elements.commentNoticesStatus.textContent, 'Unable to save hidden notifications. Please try again.');
});
