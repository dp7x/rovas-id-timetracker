const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const event = () => ({ listeners: [], addListener(fn) { this.listeners.push(fn); } });
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
    const state = { reports: 2, comments: 1, fail: '', calls: [], badge: '', title: '', color: '',
        credentials: { rovasApiKey: 'example-key', rovasToken: 'example-token', userLang: 'it' },
        alarm: { periodInMinutes: 15 }, hold: null };
    const api = {
        runtime: { getManifest: () => ({ name: 'ROVAS' }), getURL: p => p,
            onInstalled: event(), onStartup: event(), onMessage: event() },
        storage: { sync: { get: async () => ({ ...state.credentials }) }, onChanged: event() },
        i18n: { getUILanguage: () => 'fr-FR' },
        action: {
            setBadgeText: async ({ text }) => { state.badge = text; },
            setBadgeBackgroundColor: async ({ color }) => { state.color = color; },
            setBadgeTextColor: async ({ color }) => { state.textColor = color; },
            setTitle: async ({ title }) => { state.title = title; }
        },
        alarms: { get: async () => state.alarm,
            create: async (name, options) => { state.alarm = options; state.alarmName = name; }, onAlarm: event() }
    };
    const fetcher = async (url, options) => {
        if (!url.startsWith('https:')) return { json: async () => JSON.parse(fs.readFileSync(path.join(root, url), 'utf8')) };
        state.calls.push({ url, options });
        if (state.hold) await state.hold;
        if (state.fail && url.includes(state.fail)) throw new Error('Offline');
        const data = url.includes('rovas_verifications')
            ? { verifications: Array.from({ length: state.reports }, (_, i) => ({ report_nid: i + 1 })) }
            : { status: 'success', notices: Array.from({ length: state.comments }, (_, i) => ({
                nid: 123, cid: i + 1, node_title: 'Report', created: 1792429580,
                comment_url: `https://rovas.app/comment/${i + 1}`
            })) };
        return { ok: true, status: 200, headers: { get: () => 'application/json' },
            json: async () => data, text: async () => JSON.stringify(data) };
    };
    const context = vm.createContext({ chrome: api, fetch: fetcher, URL, AbortController, setTimeout, clearTimeout, console });
    for (const file of ['notification-api.js', 'comment-notices.js', 'notification-badge.js']) {
        vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
    }
    return { state, api, badge: context.RovasNotificationBadge.create(api, fetcher), model: context.RovasNotificationBadge };
}

test('badge is orange for reports, red for comments, counts both and clears at zero', async () => {
    const f = fixture();
    f.state.comments = 0;
    await f.badge.refresh();
    assert.equal(f.state.badge, '2');
    assert.equal(f.state.color, '#e08000');
    f.state.comments = 1;
    await f.badge.refresh();
    assert.equal(f.state.badge, '3');
    assert.equal(f.state.color, '#c62828');
    assert.equal(f.state.textColor, '#ffffff');
    assert.ok(f.state.title.includes('Report da validare: 2; nuove note: 1'));
    f.state.reports = f.state.comments = 0;
    await f.badge.refresh();
    assert.equal(f.state.badge, '');
    assert.ok(f.state.title.includes('Nessun report'));
    assert.equal(f.model.appearance(99, 1).text, '99+');
});

test('failure of either endpoint preserves the previous badge and reports stale status', async () => {
    const f = fixture();
    await f.badge.refresh();
    for (const failure of ['rovas_verifications', 'rovas_comment_notices']) {
        f.state.fail = failure;
        f.state.reports = f.state.comments = 0;
        await f.badge.refresh();
        assert.equal(f.state.badge, '3');
        assert.ok(f.state.title.includes('Impossibile aggiornare'));
    }
});

test('missing credentials clear the badge without making authenticated requests', async () => {
    const f = fixture();
    f.state.badge = '8';
    f.state.credentials.rovasToken = '';
    await f.badge.refresh();
    assert.equal(f.state.badge, '');
    assert.equal(f.state.calls.length, 0);
});

test('concurrent refreshes share requests and obsolete account results are discarded', async () => {
    const f = fixture();
    let release;
    f.state.hold = new Promise(resolve => { release = resolve; });
    const first = f.badge.refresh();
    const second = f.badge.refresh();
    assert.equal(first, second);
    await tick();
    assert.equal(f.state.calls.length, 2);
    f.state.credentials = { rovasApiKey: 'other-key', rovasToken: '' };
    f.badge.refresh(true);
    release();
    await first;
    assert.equal(f.state.badge, '');
    assert.ok(f.state.title.includes('identifiants'));
});

test('creates a missing alarm at 15 minutes and leaves an existing correct alarm alone', async () => {
    const f = fixture();
    assert.equal(await f.badge.ensureAlarm(), false);
    f.state.alarm = null;
    assert.equal(await f.badge.ensureAlarm(), true);
    assert.equal(f.state.alarm.periodInMinutes, 15);
    assert.equal(f.state.alarmName, 'rovas-pending-notifications');
    assert.equal(await f.badge.ensureAlarm(), false);
});

test('background listeners refresh on startup, alarm, popup message and credential change', async () => {
    const f = fixture();
    f.badge.start();
    await tick();
    assert.equal(f.state.calls.length, 0); // existing alarm, no poll on arbitrary worker wake
    f.api.runtime.onStartup.listeners[0]();
    await tick();
    assert.equal(f.state.badge, '3');
    f.state.comments = 0;
    f.api.alarms.onAlarm.listeners[0]({ name: 'rovas-pending-notifications' });
    await tick();
    assert.equal(f.state.badge, '2');
    f.state.reports = 0;
    let reply;
    assert.equal(f.api.runtime.onMessage.listeners[0]({ type: 'ROVAS_REFRESH_BADGE' }, {}, r => { reply = r; }), true);
    await tick();
    assert.equal(reply.ok, true);
    assert.equal(f.state.badge, '');
    f.state.comments = 1;
    f.api.storage.onChanged.listeners[0]({ rovasToken: {} }, 'sync');
    await tick();
    assert.equal(f.state.badge, '1');
});

test('tooltip follows browser language when no saved preference is present', async () => {
    const f = fixture();
    delete f.state.credentials.userLang;
    await f.badge.refresh();
    assert.ok(f.state.title.includes('Rapports à valider : 2'));
    for (const call of f.state.calls) {
        assert.equal(call.options.credentials, 'omit');
        assert.equal(call.options.redirect, 'error');
        assert.equal(call.options.headers['API-KEY'], 'example-key');
    }
});
