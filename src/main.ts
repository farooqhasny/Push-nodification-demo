import { LitElement, css, html } from 'lit';
import { state } from 'lit/decorators.js';

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

const VAPID_KEY = 'BA7OVhaWCXzaiOqg5EnPn0vJnR4w0UcWalDLqscsM_QlV51fRnPjoTckR8u8t4SrRAAIGfBG8oQjlWOMdkJikTI';
const ENDPOINT = 'https://faiztec.duckdns.org/webpush';
const STORAGE_KEY = 'aog-alarms';

const initialAlarms: Alarm[] = [
  { id: 'aog-test-2', title: 'AOG.ALARM_TEST_2', message: 'HH_ALARM_TEST', source: 'Unit AOG', time: '2025-07-11T23:39:46', severity: 'warning', state: 'active' },
  { id: 'pv-low-low', title: 'Site01.Area02.Fl1001', message: 'Simulated PV / LOW LOW', source: 'Site01.Area02', time: '2025-07-13T00:50:55', severity: 'critical', state: 'active' },
  { id: 'pv-normal', title: 'Site01.Area04.PI4001', message: 'Simulated PV / NORMAL', source: 'Site01.Area04', time: '2025-07-13T02:11:34', severity: 'normal', state: 'acknowledged' }
];

class AlarmTerminal extends LitElement {
  @state() private alarms = this.loadAlarms();
  @state() private filter: 'all' | AlarmState = 'all';
  @state() private tab: 'alarms' | 'settings' = 'alarms';
  @state() private status = 'Local alarm terminal ready';
  @state() private pushEnabled = false;
  @state() private busy = false;

  static styles = css`
    :host { display: block; min-height: 100vh; color: #172024; font-family: Arial, sans-serif; }
    * { box-sizing: border-box; }
    main { min-height: 100vh; max-width: 820px; margin: 0 auto; padding-bottom: 96px; background: #f4f6f7; }
    header { display: flex; align-items: center; gap: 12px; padding: 18px; background: #172024; color: #fff; }
    .mark { width: 34px; height: 34px; display: grid; place-items: center; background: #f5cc00; color: #172024; font-weight: 900; transform: rotate(45deg); }
    .mark span { transform: rotate(-45deg); }
    .brand { display: grid; gap: 3px; }.brand strong { font-size: 20px; letter-spacing: .08em; }.brand small { color: #b8c4c8; font-size: 10px; letter-spacing: .12em; }
    .status { margin-left: auto; color: #9ee2b5; font-size: 12px; font-weight: 700; }
    section { padding: 22px 16px; }.heading { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-bottom: 16px; }.eyebrow { color: #637176; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; } h1 { margin: 5px 0 0; font-size: 30px; line-height: 1; }
    button { border: 0; border-radius: 7px; padding: 11px 14px; font: inherit; font-weight: 700; cursor: pointer; }.filter { background: #e2e8ea; color: #172024; }.primary { background: #172024; color: #fff; }.secondary { background: #dceff4; color: #0b647d; }
    .summary { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 9px; color: #667479; font-size: 12px; }.list { overflow: hidden; border: 1px solid #d4dde0; border-radius: 8px; background: #fff; }.alarm { display: grid; grid-template-columns: minmax(0, 1fr) auto 60px; min-height: 92px; border-bottom: 1px solid #e1e7e9; cursor: pointer; }.alarm:last-child { border-bottom: 0; }.alarm:hover { background: #f7fafb; }.details { min-width: 0; padding: 13px 10px; }.details h2 { overflow: hidden; margin: 0 0 4px; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; }.details p { overflow: hidden; margin: 0 0 5px; color: #59686d; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }.details time, .source { color: #7a878b; font-size: 11px; }.meta { display: grid; align-content: center; justify-items: end; gap: 4px; padding: 8px; text-align: right; font-size: 11px; }.meta strong { font-size: 12px; }.severity { display: grid; place-content: center; gap: 3px; color: #fff; text-align: center; font-size: 12px; }.severity b { font-size: 16px; }.critical { background: #e93545; }.warning { background: #e0a900; }.normal { background: #20a94b; }.acknowledged { opacity: .65; }.empty { padding: 40px 20px; color: #68777b; text-align: center; }.create { display: block; margin: 16px auto; background: transparent; color: #086f8b; }
    form { display: grid; gap: 14px; max-width: 620px; } label { display: grid; gap: 7px; color: #405056; font-size: 13px; font-weight: 700; } input, textarea { width: 100%; border: 1px solid #c8d3d6; border-radius: 7px; padding: 11px; background: #fff; color: #172024; font: inherit; } textarea { min-height: 86px; }.help { color: #637176; font-size: 13px; line-height: 1.5; }.actions { display: flex; flex-wrap: wrap; gap: 10px; }.message { min-height: 20px; color: #147643; font-size: 13px; font-weight: 700; }
    nav { position: fixed; right: 0; bottom: 0; left: 0; display: flex; justify-content: center; gap: 8px; padding: 10px 14px max(10px, env(safe-area-inset-bottom)); border-top: 1px solid #d4dde0; background: rgba(255,255,255,.96); } nav button { width: min(42vw, 180px); background: transparent; color: #768388; } nav button.active { background: #dceff4; color: #086f8b; }
    @media (min-width: 700px) { section { padding: 34px 28px; } header { padding-inline: 28px; } }
  `;

  connectedCallback() {
    super.connectedCallback();
    void this.registerServiceWorker();
    navigator.serviceWorker?.addEventListener('message', this.onWorkerMessage);
  }

  disconnectedCallback() {
    navigator.serviceWorker?.removeEventListener('message', this.onWorkerMessage);
    super.disconnectedCallback();
  }

  render() {
    return html`<main>
      <header><div class="mark"><span>A</span></div><div class="brand"><strong>AOG</strong><small>ALARM TERMINAL</small></div><div class="status">${this.pushEnabled ? 'PUSH LIVE' : 'LOCAL MODE'}</div></header>
      ${this.tab === 'alarms' ? this.renderAlarms() : this.renderSettings()}
      <nav aria-label="Main navigation"><button class=${this.tab === 'alarms' ? 'active' : ''} @click=${() => { this.tab = 'alarms'; }}>Alarms</button><button class=${this.tab === 'settings' ? 'active' : ''} @click=${() => { this.tab = 'settings'; }}>Settings</button></nav>
    </main>`;
  }

  private renderAlarms() {
    const visible = this.alarms.filter((alarm) => this.filter === 'all' || alarm.state === this.filter);
    return html`<section><div class="heading"><div><span class="eyebrow">Operations</span><h1>Alarm queue</h1></div><button class="filter" @click=${this.changeFilter}>${this.filter === 'all' ? 'All alarms' : this.filter}</button></div><div class="summary"><span>${visible.length} alarms</span><span>${this.status}</span></div><div class="list">${visible.length ? visible.map((alarm) => this.renderAlarm(alarm)) : html`<div class="empty">No alarms match this filter.</div>`}</div><button class="create" @click=${this.createTestAlarm}>+ Create test alarm</button></section>`;
  }

  private renderAlarm(alarm: Alarm) {
    return html`<article class="alarm ${alarm.state}" @click=${() => this.acknowledge(alarm.id)}><div class="details"><h2>${alarm.title}</h2><p>${alarm.message}</p><time>${this.formatTime(alarm.time)}</time></div><div class="meta"><strong>${alarm.state === 'active' ? 'Active' : 'Ack'}</strong><span class="source">${alarm.source}</span></div><div class="severity ${alarm.severity}"><b>${alarm.severity === 'critical' ? 'P1' : alarm.severity === 'warning' ? 'P10' : 'P15'}</b><small>${alarm.state}</small></div></article>`;
  }

  private renderSettings() {
    return html`<section><div class="heading"><div><span class="eyebrow">Configuration</span><h1>Settings</h1></div></div><form @submit=${this.enablePush}><label>Node-RED endpoint<input type="url" .value=${ENDPOINT} readonly></label><label>Public VAPID key<textarea readonly>${VAPID_KEY}</textarea></label><p class="help">Push permission is requested only when you press the button. The public key is safe to use in the browser.</p><div class="actions"><button class="primary" ?disabled=${this.busy}>${this.busy ? 'Connecting...' : this.pushEnabled ? 'Push enabled' : 'Enable push notifications'}</button></div><p class="message">${this.status}</p></form></section>`;
  }

  private loadAlarms(): Alarm[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || initialAlarms; } catch { return initialAlarms; }
  }

  private persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alarms)); }
  private changeFilter = () => { this.filter = this.filter === 'all' ? 'active' : this.filter === 'active' ? 'acknowledged' : 'all'; };
  private createTestAlarm = () => { this.alarms = [{ id: `local-${Date.now()}`, title: 'LOCAL.TEST_ALARM', message: 'Operator test event', source: 'This device', time: new Date().toISOString(), severity: 'warning', state: 'active' }, ...this.alarms]; this.persist(); this.status = 'Test alarm created'; };
  private acknowledge = (id: string) => { this.alarms = this.alarms.map((alarm) => alarm.id === id ? { ...alarm, state: 'acknowledged' } : alarm); this.persist(); this.status = 'Alarm acknowledged locally'; };
  private formatTime = (value: string) => new Date(value).toLocaleString([], { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  private async enablePush(event: SubmitEvent) {
    event.preventDefault();
    this.busy = true;
    try {
      if (!('Notification' in window) || !('PushManager' in window)) throw new Error('Push is not supported by this browser.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.decodeKey(VAPID_KEY) });
      const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'subscribe', subscription: subscription.toJSON() }) });
      if (!response.ok) throw new Error(`Node-RED returned HTTP ${response.status}`);
      this.pushEnabled = true;
      this.status = 'Push subscription active';
    } catch (error) { this.status = error instanceof Error ? error.message : 'Push setup failed'; }
    this.busy = false;
  }

  private async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      const subscription = await registration.pushManager.getSubscription();
      this.pushEnabled = Boolean(subscription && 'Notification' in window && Notification.permission === 'granted');
    } catch { this.status = 'Ready for local alarms'; }
  }

  private onWorkerMessage = (event: MessageEvent) => {
    if (event.data?.type !== 'alarm') return;
    this.alarms = [{ ...event.data.alarm, message: event.data.alarm.body || event.data.alarm.message || 'Alarm received', time: event.data.alarm.timestamp || new Date().toISOString(), state: 'active' }, ...this.alarms];
    this.persist();
    this.status = 'New alarm received';
  };

  private decodeKey(value: string) { const padding = '='.repeat((4 - value.length % 4) % 4); const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)); }
}

customElements.define('alarm-terminal', AlarmTerminal);
