import { LitElement, css, html } from 'lit';
import { state } from 'lit/decorators.js';

type Tab = 'alarms' | 'data' | 'settings';
type Severity = 'critical' | 'warning' | 'normal';
type AlarmState = 'active' | 'acknowledged';

type Alarm = {
  id: string;
  title: string;
  message: string;
  source: string;
  time: string;
  severity: Severity;
  state: AlarmState;
};

const DEFAULT_VAPID_KEY = 'BA7OVhaWCXzaiOqg5EnPn0vJnR4w0UcWalDLqscsM_QlV51fRnPjoTckR8u8t4SrRAAIGfBG8oQjlWOMdkJikTI';
const DEFAULT_ENDPOINT = 'https://faiztec.duckdns.org/webpush';
const ALARMS_KEY = 'aog-alarms';
const VAPID_KEY_STORAGE = 'aog-vapid-key';
const ENDPOINT_STORAGE = 'aog-endpoint';

const seedAlarms: Alarm[] = [
  { id: 'aog-test-2', title: 'AOG.ALARM_TEST_2', message: 'HH_ALARM_TEST', source: 'Unit AOG', time: '2025-07-11T23:39:46', severity: 'warning', state: 'active' },
  { id: 'pv-low-low', title: 'Site01.Area02.Fl1001', message: 'Simulated PV / LOW LOW', source: 'Site01.Area02', time: '2025-07-13T00:50:55', severity: 'critical', state: 'active' },
  { id: 'pv-normal-1', title: 'Site01.Area04.PI4001', message: 'Simulated PV / NORMAL', source: 'Site01.Area04', time: '2025-07-13T02:11:34', severity: 'normal', state: 'acknowledged' },
  { id: 'pv-normal-2', title: 'Site01.Area05.TI5004', message: 'Simulated PV / NORMAL', source: 'Site01.Area05', time: '2025-07-13T02:11:34', severity: 'normal', state: 'active' }
];

class AlarmTerminal extends LitElement {
  @state() private alarms = this.loadAlarms();
  @state() private tab: Tab = 'alarms';
  @state() private filter: 'all' | AlarmState = 'all';
  @state() private status = 'Local alarm terminal ready';
  @state() private pushEnabled = false;
  @state() private busy = false;
  @state() private selectedAlarm: Alarm | null = null;
  @state() private endpoint = localStorage.getItem(ENDPOINT_STORAGE) || DEFAULT_ENDPOINT;
  @state() private vapidKey = localStorage.getItem(VAPID_KEY_STORAGE) || DEFAULT_VAPID_KEY;
  @state() private soundEnabled = localStorage.getItem('aog-sound') !== 'off';

  static styles = css`
    :host { display:block; min-height:100vh; color:#172024; font-family:Arial,sans-serif; background:#e9eef0; }
    * { box-sizing:border-box; } main { max-width:900px; min-height:100vh; margin:0 auto; padding-bottom:94px; background:#f5f7f8; }
    header { display:flex; align-items:center; gap:12px; padding:18px; color:#fff; background:#172024; } .mark { display:grid; place-items:center; width:38px; height:38px; color:#172024; background:#f5cc00; transform:rotate(45deg); font-weight:900; } .mark span { transform:rotate(-45deg); } .brand { display:grid; gap:3px; } .brand strong { font-size:21px; letter-spacing:.08em; } .brand small { color:#b9c5c8; font-size:10px; letter-spacing:.13em; } .live { margin-left:auto; color:#9ee2b5; font-size:11px; font-weight:800; letter-spacing:.08em; }
    section { padding:24px 16px; } .heading { display:flex; align-items:end; justify-content:space-between; gap:12px; margin-bottom:16px; } .eyebrow { color:#647277; font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; } h1 { margin:5px 0 0; font-size:31px; line-height:1; } h2 { margin:0; }
    button { border:0; border-radius:7px; padding:11px 14px; font:inherit; font-weight:700; cursor:pointer; } button:disabled { cursor:wait; opacity:.55; } .primary { color:#fff; background:#172024; } .secondary { color:#086f8b; background:#dceff4; } .quiet { color:#086f8b; background:transparent; } .filter { color:#172024; background:#e2e8ea; }
    .summary { display:flex; justify-content:space-between; gap:10px; margin-bottom:9px; color:#667479; font-size:12px; } .list { overflow:hidden; border:1px solid #d4dde0; border-radius:8px; background:#fff; } .alarm { display:grid; grid-template-columns:minmax(0,1fr) auto 64px; min-height:96px; border-bottom:1px solid #e1e7e9; cursor:pointer; } .alarm:last-child { border-bottom:0; } .alarm:hover { background:#f7fafb; } .details { min-width:0; padding:14px 11px; } .details h2 { overflow:hidden; margin-bottom:5px; text-overflow:ellipsis; white-space:nowrap; font-size:15px; } .details p { overflow:hidden; margin:0 0 6px; color:#59686d; text-overflow:ellipsis; white-space:nowrap; font-size:12px; } .details time,.source { color:#7a878b; font-size:11px; } .meta { display:grid; align-content:center; justify-items:end; gap:4px; padding:8px; text-align:right; font-size:11px; } .meta strong { font-size:12px; } .severity { display:grid; place-content:center; gap:3px; color:#fff; text-align:center; font-size:11px; } .severity b { font-size:16px; } .critical { background:#e93545; } .warning { background:#dfa900; } .normal { background:#20a94b; } .acknowledged { opacity:.63; } .empty { padding:42px 20px; color:#68777b; text-align:center; } .create { display:block; margin:16px auto 0; }
    .metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:22px 0; } .metric { padding:15px 12px; border:1px solid #d4dde0; border-radius:8px; background:#fff; } .metric span { display:block; color:#667479; font-size:11px; } .metric strong { display:block; margin-top:8px; font-size:28px; }
    form { display:grid; gap:15px; max-width:680px; } label { display:grid; gap:7px; color:#405056; font-size:13px; font-weight:700; } input,textarea { width:100%; border:1px solid #c8d3d6; border-radius:7px; padding:11px; color:#172024; background:#fff; font:inherit; } textarea { min-height:80px; resize:vertical; } .help,.message { color:#637176; font-size:13px; line-height:1.5; } .message { min-height:20px; margin:0; font-weight:700; } .actions { display:flex; flex-wrap:wrap; gap:10px; }
    nav { position:fixed; right:0; bottom:0; left:0; z-index:2; display:flex; justify-content:center; gap:8px; padding:10px 14px max(10px,env(safe-area-inset-bottom)); border-top:1px solid #d4dde0; background:rgba(255,255,255,.96); } nav button { width:min(29vw,170px); color:#768388; background:transparent; } nav button.active { color:#086f8b; background:#dceff4; }
    dialog { width:min(92vw,520px); border:0; border-radius:10px; padding:24px; color:#172024; box-shadow:0 18px 60px #17202444; } dialog::backdrop { background:#17202466; } dialog h2 { margin:7px 0; font-size:25px; } dialog p { color:#59686d; line-height:1.5; } .close { float:right; padding:4px 8px; color:#657277; background:transparent; font-size:22px; }
    @media (min-width:700px) { header { padding-inline:28px; } section { padding:34px 28px; } }
    @media (max-width:520px) { .metrics { grid-template-columns:1fr; } .meta { display:none; } .alarm { grid-template-columns:minmax(0,1fr) 60px; } }
  `;

  connectedCallback() { super.connectedCallback(); void this.registerServiceWorker(); navigator.serviceWorker?.addEventListener('message', this.onWorkerMessage); }
  disconnectedCallback() { navigator.serviceWorker?.removeEventListener('message', this.onWorkerMessage); super.disconnectedCallback(); }

  render() {
    const active = this.alarms.filter((alarm) => alarm.state === 'active').length;
    return html`<main>
      <header><div class="mark"><span>A</span></div><div class="brand"><strong>AOG</strong><small>ALARM TERMINAL</small></div><div class="live">${this.pushEnabled ? '● PUSH LIVE' : '○ LOCAL MODE'}</div></header>
      ${this.tab === 'alarms' ? this.renderAlarms() : this.tab === 'data' ? this.renderData(active) : this.renderSettings()}
      <nav aria-label="Primary navigation">${this.navButton('alarms','Alarms','▤')}${this.navButton('data','Data','▦')}${this.navButton('settings','Settings','⚙')}</nav>
      ${this.selectedAlarm ? this.renderDialog(this.selectedAlarm) : ''}
    </main>`;
  }

  private navButton(tab: Tab, label: string, icon: string) { return html`<button class=${this.tab === tab ? 'active' : ''} @click=${() => { this.tab = tab; this.refresh(); }} aria-current=${this.tab === tab ? 'page' : 'false'}><span aria-hidden="true">${icon}</span> ${label}</button>`; }

  private renderAlarms() {
    const visible = this.alarms.filter((alarm) => this.filter === 'all' || alarm.state === this.filter);
    return html`<section><div class="heading"><div><span class="eyebrow">Operations</span><h1>Alarm queue</h1></div><button class="filter" @click=${this.changeFilter}>${this.filterLabel()}</button></div><div class="summary"><span>${visible.length} alarms shown</span><span>${this.status}</span></div><div class="list">${visible.length ? visible.map((alarm) => this.renderAlarm(alarm)) : html`<div class="empty">No alarms match this filter.</div>`}</div><button class="quiet create" @click=${this.createTestAlarm}>+ Create test alarm</button></section>`;
  }

  private renderAlarm(alarm: Alarm) { return html`<article class="alarm ${alarm.state}" role="button" tabindex="0" @click=${() => { this.selectedAlarm = alarm; this.refresh(); }} @keydown=${(event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') { this.selectedAlarm = alarm; this.refresh(); } }}><div class="details"><h2>${alarm.title}</h2><p>${alarm.message}</p><time>${this.formatTime(alarm.time)}</time></div><div class="meta"><strong>${alarm.state === 'active' ? 'Active' : 'Acknowledged'}</strong><span class="source">${alarm.source}</span></div><div class="severity ${alarm.severity}"><b>${this.severityCode(alarm.severity)}</b><small>${alarm.state}</small></div></article>`; }

  private renderData(active: number) { const acknowledged = this.alarms.filter((alarm) => alarm.state === 'acknowledged').length; return html`<section><div class="heading"><div><span class="eyebrow">Data</span><h1>Terminal health</h1></div></div><div class="metrics"><div class="metric"><span>Active alarms</span><strong>${active}</strong></div><div class="metric"><span>Acknowledged</span><strong>${acknowledged}</strong></div><div class="metric"><span>Total stored</span><strong>${this.alarms.length}</strong></div></div><div class="list"><div class="details"><h2>Delivery status</h2><p>${this.pushEnabled ? 'Browser push subscription is active.' : 'Push is disabled. Local test alarms remain available.'}</p><time>${this.status}</time></div></div></section>`; }

  private renderSettings() { return html`<section><div class="heading"><div><span class="eyebrow">Configuration</span><h1>Settings</h1></div></div><form @submit=${this.saveSettings}><label>Node-RED endpoint<input type="url" .value=${this.endpoint} @input=${this.onEndpointChange} required></label><label>Public VAPID key<textarea .value=${this.vapidKey} @input=${this.onVapidChange} rows="3" required spellcheck="false"></textarea></label><label><span>Alarm sound</span><select @change=${this.onSoundChange}><option value="on" ?selected=${this.soundEnabled}>Enabled</option><option value="off" ?selected=${!this.soundEnabled}>Muted</option></select></label><p class="help">Notification permission is requested only when you enable push. Changing the VAPID key may require removing the current subscription first.</p><div class="actions"><button class="primary" type="submit">Save settings</button><button class="secondary" type="button" @click=${this.enablePush} ?disabled=${this.busy}>${this.busy ? 'Connecting...' : this.pushEnabled ? 'Refresh push' : 'Enable push'}</button><button class="quiet" type="button" @click=${this.disablePush} ?disabled=${!this.pushEnabled || this.busy}>Unsubscribe</button></div><p class="message">${this.status}</p></form></section>`; }

  private renderDialog(alarm: Alarm) { return html`<dialog open><button class="close" aria-label="Close details" @click=${this.closeDialog}>×</button><span class="eyebrow">${this.severityCode(alarm.severity)} alarm</span><h2>${alarm.title}</h2><p>${alarm.message}</p><p><strong>Source:</strong> ${alarm.source}<br><strong>Received:</strong> ${this.formatTime(alarm.time)}<br><strong>State:</strong> ${alarm.state}</p><div class="actions"><button class="primary" @click=${() => this.acknowledge(alarm.id)} ?disabled=${alarm.state === 'acknowledged'}>${alarm.state === 'acknowledged' ? 'Acknowledged' : 'Acknowledge alarm'}</button><button class="secondary" @click=${this.closeDialog}>Close</button></div></dialog>`; }

  private loadAlarms(): Alarm[] { try { return JSON.parse(localStorage.getItem(ALARMS_KEY) || 'null') || seedAlarms; } catch { return seedAlarms; } }
  private persist() { localStorage.setItem(ALARMS_KEY, JSON.stringify(this.alarms)); }
  private filterLabel() { return this.filter === 'all' ? 'All alarms' : this.filter === 'active' ? 'Active only' : 'Acknowledged'; }
  private changeFilter = () => { this.filter = this.filter === 'all' ? 'active' : this.filter === 'active' ? 'acknowledged' : 'all'; this.refresh(); };
  private createTestAlarm = () => { const alarm: Alarm = { id: `local-${Date.now()}`, title: 'LOCAL.TEST_ALARM', message: 'Operator test event', source: 'This device', time: new Date().toISOString(), severity: 'warning', state: 'active' }; this.alarms = [alarm, ...this.alarms].slice(0, 100); this.persist(); this.status = 'Test alarm created'; this.tab = 'alarms'; this.refresh(); };
  private acknowledge = (id: string) => { this.alarms = this.alarms.map((alarm) => alarm.id === id ? { ...alarm, state: 'acknowledged' } : alarm); this.persist(); this.status = 'Alarm acknowledged locally'; this.selectedAlarm = null; this.refresh(); };
  private closeDialog = () => { this.selectedAlarm = null; this.refresh(); };
  private refresh() { this.requestUpdate(); }
  private severityCode(severity: Severity) { return severity === 'critical' ? 'P1' : severity === 'warning' ? 'P10' : 'P15'; }
  private formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : date.toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  private onEndpointChange = (event: Event) => { this.endpoint = (event.target as HTMLInputElement).value; };
  private onVapidChange = (event: Event) => { this.vapidKey = (event.target as HTMLTextAreaElement).value; };
  private onSoundChange = (event: Event) => { this.soundEnabled = (event.target as HTMLSelectElement).value === 'on'; localStorage.setItem('aog-sound', this.soundEnabled ? 'on' : 'off'); this.refresh(); };
  private saveSettings = (event: SubmitEvent) => { event.preventDefault(); localStorage.setItem(ENDPOINT_STORAGE, this.endpoint.trim()); localStorage.setItem(VAPID_KEY_STORAGE, this.vapidKey.trim()); this.status = 'Settings saved locally'; this.refresh(); };

  private async enablePush() { this.busy = true; try { if (!('Notification' in window) || !('PushManager' in window)) throw new Error('Push is not supported by this browser.'); if (Notification.permission === 'denied') throw new Error('Notifications are blocked in browser settings.'); const permission = await Notification.requestPermission(); if (permission !== 'granted') throw new Error('Notification permission was not granted.'); const registration = await navigator.serviceWorker.ready; const existing = await registration.pushManager.getSubscription(); const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.decodeKey(this.vapidKey.trim()) }); const response = await fetch(this.endpoint.trim(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'subscribe', subscription: subscription.toJSON() }) }); if (!response.ok) throw new Error(`Node-RED returned HTTP ${response.status}`); this.pushEnabled = true; this.status = 'Push subscription active'; } catch (error) { this.status = error instanceof Error ? error.message : 'Push setup failed'; } finally { this.busy = false; } }
  private async disablePush() { this.busy = true; try { const registration = await navigator.serviceWorker.ready; const subscription = await registration.pushManager.getSubscription(); if (subscription) { await fetch(this.endpoint.trim(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unsubscribe', subscription: subscription.toJSON() }) }); await subscription.unsubscribe(); } this.pushEnabled = false; this.status = 'Push subscription removed'; } catch (error) { this.status = error instanceof Error ? error.message : 'Could not unsubscribe'; } finally { this.busy = false; } }
  private async registerServiceWorker() { if (!('serviceWorker' in navigator)) { this.status = 'Push unavailable in this browser'; return; } try { const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`); const subscription = await registration.pushManager.getSubscription(); this.pushEnabled = Boolean(subscription && 'Notification' in window && Notification.permission === 'granted'); } catch { this.status = 'Local alarm mode'; } }
  private onWorkerMessage = (event: MessageEvent) => { if (event.data?.type !== 'alarm') return; const received = event.data.alarm || {}; const alarm: Alarm = { id: String(received.id || `push-${Date.now()}`), title: String(received.title || 'New alarm'), message: String(received.body || received.message || 'An alarm needs attention.'), source: String(received.source || 'Node-RED'), time: String(received.timestamp || new Date().toISOString()), severity: received.severity === 'critical' || received.severity === 'normal' ? received.severity : 'warning', state: 'active' }; if (!this.alarms.some((existing) => existing.id === alarm.id)) { this.alarms = [alarm, ...this.alarms].slice(0, 100); this.persist(); } this.status = 'New alarm received'; };
  private decodeKey(value: string) { const padding = '='.repeat((4 - value.length % 4) % 4); const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)); }
}

customElements.define('alarm-terminal', AlarmTerminal);
