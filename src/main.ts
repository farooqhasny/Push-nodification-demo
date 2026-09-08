import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './styles.css';

type Tab = 'alarms' | 'data' | 'settings';
type Severity = 'critical' | 'warning' | 'normal';
type AlarmState = 'active' | 'acknowledged' | 'cleared';

interface Alarm {
  id: string;
  title: string;
  body: string;
  source: string;
  timestamp: string;
  severity: Severity;
  state: AlarmState;
}

const DEFAULT_VAPID_KEY = 'BA7OVhaWCXzaiOqg5EnPn0vJnR4w0UcWalDLqscsM_QlV51fRnPjoTckR8u8t4SrRAAIGfBG8oQjlWOMdkJikTI';
const NODE_RED_ENDPOINT = 'https://faiztec.duckdns.org/webpush';
const STORAGE_KEY = 'aog-alarm-terminal';

const sampleAlarms: Alarm[] = [
  { id: 'aog-test-2', title: 'AOG.ALARM_TEST_2', body: 'HH_ALARM_TEST', source: 'Unit AOG', timestamp: '2025-07-11T23:39:46', severity: 'warning', state: 'active' },
  { id: 'pv-low-low', title: 'Site01.Area02.Fl1001', body: 'Simulated PV / LOW LOW', source: 'Site01.Area02', timestamp: '2025-07-13T00:50:55', severity: 'critical', state: 'active' },
  { id: 'pv-normal-1', title: 'Site01.Area04.PI4001', body: 'Simulated PV / NORMAL', source: 'Site01.Area04', timestamp: '2025-07-13T02:11:34', severity: 'normal', state: 'acknowledged' },
  { id: 'pv-normal-2', title: 'Site01.Area05.TI5004', body: 'Simulated PV / NORMAL', source: 'Site01.Area05', timestamp: '2025-07-13T02:11:34', severity: 'normal', state: 'active' },
  { id: 'pv-normal-3', title: 'Site01.Area05.TI5006', body: 'Simulated PV / NORMAL', source: 'Site01.Area05', timestamp: '2025-07-13T02:19:41', severity: 'normal', state: 'active' }
];

@customElement('alarm-terminal')
export class AlarmTerminal extends LitElement {
  @state() private activeTab: Tab = 'alarms';
  @state() private alarms: Alarm[] = this.loadAlarms();
  @state() private filter: 'all' | AlarmState = 'all';
  @state() private vapidKey = localStorage.getItem('aog-vapid-key') || DEFAULT_VAPID_KEY;
  @state() private endpoint = localStorage.getItem('aog-endpoint') || NODE_RED_ENDPOINT;
  @state() private status = 'Ready for alarms';
  @state() private connected = false;
  @state() private subscription: PushSubscription | null = null;
  @state() private saving = false;

  static styles = css` :host { display: block; } `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('online', this.handleOnline);
    navigator.serviceWorker?.addEventListener('message', this.handleWorkerMessage);
    void this.initializePush();
  }

  disconnectedCallback() {
    window.removeEventListener('online', this.handleOnline);
    navigator.serviceWorker?.removeEventListener('message', this.handleWorkerMessage);
    super.disconnectedCallback();
  }

  render() {
    const activeCount = this.alarms.filter((alarm) => alarm.state === 'active').length;
    return html`
      <main class="app-shell">
        <header class="topbar">
          <div class="brand-mark" aria-hidden="true"><span></span></div>
          <div class="brand-copy"><strong>AOG</strong><small>ALARM TERMINAL</small></div>
          <div class="connection ${this.connected ? 'is-live' : ''}" aria-label=${this.connected ? 'Push connected' : 'Push not connected'}><span></span>${this.connected ? 'Live' : 'Offline'}</div>
        </header>
        ${this.activeTab === 'alarms' ? this.renderAlarms(activeCount) : ''}
        ${this.activeTab === 'data' ? this.renderData(activeCount) : ''}
        ${this.activeTab === 'settings' ? this.renderSettings() : ''}
        <nav class="bottom-nav" aria-label="Primary navigation">
          ${this.navButton('alarms', 'Alarms', '▤')}
          ${this.navButton('data', 'Data', '▦')}
          ${this.navButton('settings', 'Settings', '⚙')}
        </nav>
        <p class="sr-only" aria-live="polite">${this.status}</p>
      </main>
    `;
  }

  private renderAlarms(activeCount: number) {
    const visible = this.alarms.filter((alarm) => this.filter === 'all' || alarm.state === this.filter);
    return html`
      <section class="content" aria-labelledby="alarms-heading">
        <div class="view-switcher">
          <div><span class="eyebrow">Operations</span><h1 id="alarms-heading">Alarm queue</h1></div>
          <button class="filter-button" @click=${this.cycleFilter} aria-label="Change alarm filter">${this.filterLabel()} <span aria-hidden="true">⌄</span></button>
        </div>
        <div class="summary-row"><span>Showing ${visible.length} alarms</span><span class="delivery-state"><i></i>${this.status}</span></div>
        <div class="alarm-list" role="list">
          ${visible.length ? visible.map((alarm) => this.renderAlarm(alarm)) : html`<div class="empty-state">No alarms match this filter.</div>`}
        </div>
        <button class="test-button" @click=${this.createTestAlarm}>＋ Create test alarm</button>
      </section>
    `;
  }

  private renderAlarm(alarm: Alarm) {
    return html`
      <article class="alarm-row ${alarm.state}" role="listitem" @click=${() => this.openAlarm(alarm)}>
        <div class="alarm-main"><h2 title=${alarm.title}>${alarm.title}</h2><time>${this.formatTime(alarm.timestamp)}</time><p>${alarm.body}</p></div>
        <div class="alarm-meta"><strong>${this.stateLabel(alarm.state)}</strong><span>${alarm.source}</span></div>
        <div class="severity severity-${alarm.severity}"><b>${this.severityLabel(alarm.severity)}</b><small>${alarm.state}</small></div>
      </article>
    `;
  }

  private renderData(activeCount: number) {
    return html`<section class="content page-panel"><span class="eyebrow">Data</span><h1>Terminal health</h1><div class="metric-grid"><div><span>Active alarms</span><strong>${activeCount}</strong></div><div><span>Delivery</span><strong>${this.connected ? 'Live' : 'Off'}</strong></div><div><span>Stored events</span><strong>${this.alarms.length}</strong></div></div><p class="muted">Alarm history is kept on this device for continuity. Push delivery is handled by the browser service worker.</p></section>`;
  }

  private renderSettings() {
    return html`<section class="content page-panel" aria-labelledby="settings-heading"><span class="eyebrow">Configuration</span><h1 id="settings-heading">Settings</h1><form @submit=${this.saveSettings}><label>Node-RED endpoint<input .value=${this.endpoint} @input=${this.onEndpointInput} type="url" required /></label><label>Public VAPID key<textarea .value=${this.vapidKey} @input=${this.onVapidInput} rows="3" required spellcheck="false"></textarea></label><p class="help">The public key is safe to store locally. Changing it may require unsubscribing and subscribing again.</p><div class="settings-actions"><button class="primary-button" type="submit" ?disabled=${this.saving}>${this.saving ? 'Saving...' : 'Save settings'}</button><button class="secondary-button" type="button" @click=${this.subscribe}>${this.subscription ? 'Refresh push' : 'Enable push'}</button></div><p class="settings-status">${this.status}</p></form></section>`;
  }

  private navButton(tab: Tab, label: string, icon: string) {
    return html`<button class=${this.activeTab === tab ? 'active' : ''} @click=${() => { this.activeTab = tab; }} aria-current=${this.activeTab === tab ? 'page' : 'false'}><span aria-hidden="true">${icon}</span><small>${label}</small></button>`;
  }

  private renderAlarmDetail(alarm: Alarm) {
    const acknowledged = alarm.state === 'acknowledged';
    const dialog = document.createElement('dialog');
    dialog.className = 'alarm-dialog';
    dialog.innerHTML = `<form method="dialog"><button class="close-dialog" aria-label="Close">×</button><span class="eyebrow">${this.severityLabel(alarm.severity)} alarm</span><h2>${this.escape(alarm.title)}</h2><p>${this.escape(alarm.body)}</p><small>${this.escape(alarm.source)} · ${this.escape(this.formatTime(alarm.timestamp))}</small><button class="primary-button" value="acknowledge" ${acknowledged ? 'disabled' : ''}>${acknowledged ? 'Acknowledged' : 'Acknowledge alarm'}</button></form>`;
    dialog.addEventListener('close', () => { if (dialog.returnValue === 'acknowledge') this.acknowledge(alarm.id); dialog.remove(); });
    this.shadowRoot?.append(dialog);
    dialog.showModal();
  }

  private openAlarm(alarm: Alarm) { this.renderAlarmDetail(alarm); }

  private acknowledge(id: string) {
    this.alarms = this.alarms.map((alarm) => alarm.id === id ? { ...alarm, state: 'acknowledged' } : alarm);
    this.persistAlarms();
    this.status = 'Alarm acknowledged locally';
  }

  private createTestAlarm() {
    const alarm: Alarm = { id: `test-${Date.now()}`, title: 'LOCAL.TEST_ALARM', body: 'Operator test event', source: 'Local terminal', timestamp: new Date().toISOString(), severity: 'warning', state: 'active' };
    this.addAlarm(alarm);
    this.status = 'Test alarm created';
  }

  private addAlarm(alarm: Alarm) {
    if (this.alarms.some((existing) => existing.id === alarm.id)) return;
    this.alarms = [alarm, ...this.alarms].slice(0, 100);
    this.persistAlarms();
  }

  private async initializePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { this.status = 'Push unavailable in this browser'; return; }
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      this.subscription = await registration.pushManager.getSubscription();
      this.connected = Boolean(this.subscription && Notification.permission === 'granted');
      if (this.connected) this.status = 'Push subscription active';
    } catch { this.status = 'Service worker registration failed'; }
  }

  private async subscribe() {
    this.saving = true;
    try {
      if (!this.vapidKey.trim() || this.vapidKey.trim().length < 80) throw new Error('Enter a valid public VAPID key.');
      if (Notification.permission === 'denied') throw new Error('Notifications are blocked in browser settings.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.urlBase64ToUint8Array(this.vapidKey.trim()) });
      await this.sendSubscription('subscribe', this.subscription);
      this.connected = true;
      this.status = 'Push subscription active';
    } catch (error) { this.status = error instanceof Error ? error.message : 'Could not enable push'; }
    finally { this.saving = false; }
  }

  private async unsubscribe() {
    if (!this.subscription) return;
    await this.sendSubscription('unsubscribe', this.subscription);
    await this.subscription.unsubscribe();
    this.subscription = null;
    this.connected = false;
    this.status = 'Push subscription removed';
  }

  private async sendSubscription(action: 'subscribe' | 'unsubscribe', subscription: PushSubscription) {
    const response = await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, subscription: subscription.toJSON() }) });
    if (!response.ok) throw new Error(`Node-RED returned HTTP ${response.status}`);
  }

  private async saveSettings(event: SubmitEvent) {
    event.preventDefault();
    localStorage.setItem('aog-vapid-key', this.vapidKey.trim());
    localStorage.setItem('aog-endpoint', this.endpoint.trim());
    this.status = 'Settings saved locally';
  }

  private loadAlarms(): Alarm[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || sampleAlarms; } catch { return sampleAlarms; } }
  private persistAlarms() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alarms)); }
  private handleOnline = () => { this.status = 'Online'; };
  private handleWorkerMessage = (event: MessageEvent) => { if (event.data?.type === 'alarm') { this.addAlarm({ ...event.data.alarm, state: 'active' }); this.status = 'New alarm received'; } };
  private cycleFilter = () => { this.filter = this.filter === 'all' ? 'active' : this.filter === 'active' ? 'acknowledged' : this.filter === 'acknowledged' ? 'cleared' : 'all'; };
  private filterLabel() { return this.filter === 'all' ? 'All alarms' : this.filter[0].toUpperCase() + this.filter.slice(1); }
  private stateLabel(state: AlarmState) { return state === 'active' ? 'Active' : state === 'acknowledged' ? 'Acknowledged' : 'Cleared'; }
  private severityLabel(severity: Severity) { return severity === 'critical' ? 'P1' : severity === 'warning' ? 'P10' : 'P15'; }
  private formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : date.toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  private onVapidInput = (event: Event) => { this.vapidKey = (event.target as HTMLTextAreaElement).value; };
  private onEndpointInput = (event: Event) => { this.endpoint = (event.target as HTMLInputElement).value; };
  private escape(value: string) { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character); }
  private urlBase64ToUint8Array(value: string) { const padding = '='.repeat((4 - value.length % 4) % 4); const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)); }
}
