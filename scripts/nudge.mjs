/* DUMBASS LIFT — daily "don't skip" push.
 *
 * Runs in GitHub Actions once a day (~3 PM Oslo). Reads the user's synced
 * account doc straight from Firestore's public REST API (rules: `allow get`),
 * decides whether today is a skipped training day, and sends a Web Push.
 * No server, no Firebase billing, no admin creds — just the public API key
 * plus the VAPID keypair (private key lives in repo secrets).
 *
 * Env (from GitHub secrets): NUDGE_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE
 */
import crypto from 'node:crypto';
import webpush from 'web-push';

const EMAIL = (process.env.NUDGE_EMAIL || '').trim();
const VAPID_PUBLIC = process.env.VAPID_PUBLIC;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE;

const PROJECT = 'poengliste-17mai-jacob';
const API_KEY = 'AIzaSyD8cBJlSucIESwRYruh55u15xX21YEMbyM';
const APP_URL = 'https://istadjacob-png.github.io/dumbass-lift/';

const b64url = b => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const emailKey = email => b64url(crypto.createHash('sha256').update('dumbass:' + email.toLowerCase()).digest());

function localDate(tz, when = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(when);
}
function localWeekdayMon0(tz, when = new Date()) {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(when);
  return { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[wd];
}

async function main() {
  if (!EMAIL || !VAPID_PUBLIC || !VAPID_PRIVATE) { console.log('Missing env — skipping'); return; }
  const id = emailKey(EMAIL);
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/accounts/${id}?key=${API_KEY}`;
  const res = await fetch(url);
  if (res.status === 404) { console.log('No synced account yet — nothing to do.'); return; }
  if (!res.ok) { console.log('Firestore read failed:', res.status); return; }

  const doc = await res.json();
  const stateStr = doc.fields && doc.fields.state && doc.fields.state.stringValue;
  if (!stateStr) { console.log('Account has no synced state.'); return; }

  let state;
  try { state = JSON.parse(stateStr); } catch (e) { console.log('State JSON parse failed.'); return; }

  const push = state.push;
  if (!push || !push.sub || !push.sub.endpoint) { console.log('Notifications not enabled on any device.'); return; }

  const tz = push.tz || 'Europe/Oslo';
  const today = localDate(tz);
  const wk = localWeekdayMon0(tz);
  const sched = Array.isArray(push.schedule) ? push.schedule : null;
  const slot = sched ? sched[wk % sched.length] : null;
  const isRest = slot ? slot.type === 'rest' : false;
  const dayName = (slot && slot.name) ? slot.name : 'training';

  const trainedToday = (state.history || []).some(h => {
    if (!h || h.partial || !h.date) return false;
    return localDate(tz, new Date(h.date)) === today;
  });

  let title, body;
  if (isRest) {
    title = 'Rest day · DUMBASS LIFT';
    body = 'No session today. Eat, sleep, grow — recover well and back at it tomorrow. 💤';
  } else if (trainedToday) {
    console.log('Already trained today — no nudge.'); return;
  } else {
    title = `Don't skip — ${dayName}`;
    body = "You haven't logged today's session. Two minutes to start. Don't break the chain. 🔥";
  }

  webpush.setVapidDetails('mailto:' + EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  try {
    await webpush.sendNotification(push.sub, JSON.stringify({ title, body, url: APP_URL }));
    console.log('Push sent:', title);
  } catch (e) {
    const code = e.statusCode || e.message;
    console.log('Push failed:', code);
    if (e.statusCode === 404 || e.statusCode === 410) console.log('Subscription expired — user must re-enable in the app.');
  }
}

main().catch(e => { console.error(e); process.exit(0); });
