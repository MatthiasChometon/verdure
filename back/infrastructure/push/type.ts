// One browser push endpoint plus the two keys the push service needs to encrypt
// the payload for it. Mirrors the shape a `PushSubscription` serialises to in the
// browser (endpoint + keys.p256dh + keys.auth).
export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// What the service worker renders as a notification. `url` is where a click
// takes the reader (an in-app path, resolved against the front origin).
export type PushNotificationPayload = {
  title: string;
  body: string;
  url: string;
};

// `expired` means the browser has dropped the subscription (404/410) and the
// caller should delete it; `failed` is a transient/other error kept quiet.
export type PushSendResult = 'sent' | 'expired' | 'failed';
