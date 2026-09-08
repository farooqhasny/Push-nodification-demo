# Agents Guide

## Project

This repository is for a Progressive Web App (PWA) that acts as an alarm terminal. It receives browser push notifications from a Node-RED application using the Web Push API. The app must remain useful as an installed application and must make incoming alarms difficult to miss without creating unsafe or misleading behavior.

The current Node-RED host is `https://faiztec.duckdns.org/`. The referenced flow is the `node-red-contrib-web-push` demo flow:
`https://github.com/webmaxru/node-red-contrib-web-push/blob/master/demo-flow.json`.

The repository currently contains documentation only. For the current task, update `agents.md` only; do not generate application code, configuration, or deployment files. When implementation begins later, keep the first version small, testable, and focused on the push subscription lifecycle and alarm presentation.

## Integration Contract

The demo flow exposes a POST endpoint at:

```text
https://faiztec.duckdns.org/webpush
```

Register a subscription with a JSON body shaped like:

```json
{
  "action": "subscribe",
  "subscription": {
    "endpoint": "...",
    "expirationTime": null,
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

Unregister using the same subscription object and `"action": "unsubscribe"`. The flow compares subscriptions by `subscription.endpoint`, returns a JSON result, and responds with HTTP 200 for supported actions. Unsupported actions receive HTTP 400.

The notification node uses notification data containing at least a title and body. Treat the received payload as untrusted input and tolerate missing optional fields. Do not couple the UI to the exact demo text; use a stable internal alarm model and map provider payloads into it.

Do not assume the Node-RED editor root page is the API response. Use the explicit `/webpush` endpoint. Confirm the deployed route, CORS policy, and payload shape before changing the client contract.

## PWA Requirements

- Serve the app and service worker over HTTPS in production. `localhost` is acceptable for local development.
- Include a valid web app manifest with a useful name, icons, `start_url`, `display`, and theme colors.
- Register the service worker from the correct scope and handle registration failures visibly.
- Request notification permission only after a clear user action explaining why alarms need it; never request it on initial page load.
- Use `PushManager.subscribe()` with the Node-RED VAPID public key. The private VAPID key must never be shipped to the browser, committed, logged, or placed in frontend configuration.
- Persist the subscription state locally, but reconcile it with the browser's current `pushManager.getSubscription()` result on startup and after permission changes.
- Treat subscription endpoints and keys as sensitive operational data. Do not log full subscriptions in production.
- Support unsubscribe and permission-denied states without trapping the user in a broken setup screen.
- The service worker must handle push events when the app is closed, show a notification, and handle notification clicks by opening or focusing the app at a useful route.
- Do not rely on an open page, WebSocket, timer, or foreground JavaScript loop to receive alarms.

## Alarm Terminal Behavior

An alarm is an operational event, not a generic chat notification. Preserve the title, message, timestamp, and any safe action metadata supplied by the sender. The interface should make the current alarm state obvious at a glance and work on both an installed mobile PWA and a desktop terminal.

When implementing alarm behavior:

- Show a clear visual state for new, acknowledged, and cleared alarms.
- Provide an explicit acknowledge action and make it keyboard accessible.
- Use sound or vibration only when supported and permitted; provide a visible fallback and a user-controlled mute/test setting.
- Avoid automatically claiming that an alarm was cleared unless the backend contract supports acknowledgement or clearing.
- Prevent duplicate delivery from producing an unbounded pile of identical active alarms. Deduplication needs a documented identifier or a conservative, testable policy.
- Keep alarm content readable at distance and do not let long or untrusted text break the layout.
- Make notification click behavior deterministic, including when the app was not open.
- Do not use browser notification permission as the only source of alarm state. The UI should explain when delivery is disabled or permission is unavailable.

## Security and Reliability

- 
- The public demo flow contains key material; treat it as example material only. If those keys are used anywhere outside a disposable demo, rotate them before relying on the system.
- Use HTTPS and validate the exact origin used by the frontend. Do not weaken TLS or add permissive CORS as a shortcut.
- Expect expired, revoked, and invalid subscriptions. Handle a failed registration or send without crashing the PWA and provide actionable status to the operator.
- Do not expose Node-RED administration endpoints or credentials through the frontend.
- Do not put secrets in the manifest, service worker, browser storage intended for public data, or client-side bundles.
- Consider offline behavior explicitly: cached shell assets may load offline, but an offline client cannot promise real-time alarm delivery unless another channel exists.

## Implementation Conventions

- Prefer the platform Web Push, Notifications, Service Worker, and Cache APIs unless an existing dependency is clearly justified.
- Keep API access in one small client module and keep alarm state separate from subscription state.
- Validate external data at the boundary before rendering it.
- Use accessible HTML controls and semantic status announcements for important alarm changes.
- Keep configuration environment-specific. The Node-RED base URL and VAPID public key should be replaceable without editing business logic.
- Do not rewrite unrelated files or introduce a framework solely for the push integration.
- Add focused tests for subscription registration, unregistration, permission denial, malformed payloads, duplicate alarms, service-worker notification clicks, and the main alarm state transitions.

## Verification Checklist

Before considering a push change complete, verify:

1. A fresh browser can install the PWA and register a subscription after explicit user consent.
2. The app sends the expected `subscribe` body to `/webpush` and handles success and failure responses.
3. Reloading the app does not create duplicate subscriptions or duplicate local alarms.
4. A test push is displayed when the app is foregrounded, backgrounded, and fully closed.
5. Clicking the notification opens or focuses the intended app view.
6. Unsubscribe removes the browser subscription and updates the UI.
7. Permission denied, offline mode, expired subscriptions, and malformed notification data produce understandable operator feedback.
8. Production builds contain no private VAPID key, Node-RED credential, or diagnostic logging of full subscription objects.

## Source of Truth

If this guide conflicts with the deployed Node-RED flow, verify the live flow and update the integration client and this document together. Do not silently infer a new backend protocol from a frontend implementation.
