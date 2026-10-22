const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const strava = require("./strava.js");
const { shouldNotifyPlanPublished } = require("./planPublished.js");

admin.initializeApp();

const TIME_ZONE = "Europe/Berlin";
const REMINDER_WINDOW_MINUTES = 5;
const REST_DAY_THRESHOLD_DAYS = 3;
const COVERAGE_GAP_THRESHOLD = 1.0;
const REMINDER_TYPES = {
  workout: true,
  activeWorkout: true,
  habit: true,
  coverage: true,
  restday: true,
  plan: true,
};

// Kanonische Muscle-Group-IDs für den Coverage-Alert. Bewusst hier
// hardcodiert statt aus der KB gelesen (siehe src/lib/db/shared/muscle.js) —
// die volle KB-Auflösung (setKBMuscles + live /fitness/muscles/viz) in eine
// Cloud Function zu ziehen wäre eine eigene Baustelle. Deckt nur die groben
// Sammelgruppen ab, keine Sub-Muskel-Granularität.
const MUSCLE_GROUP_LABELS = {
  chest: "Brust",
  back: "Rücken",
  shoulders: "Schultern",
  arms: "Arme",
  core: "Rumpf",
  glutes: "Gesäß",
  quadriceps: "Quadrizeps",
  hamstrings: "Beinbeuger",
  calves: "Waden",
};

const NOTIFICATIONS = yaml.load(fs.readFileSync(path.join(__dirname, "notifications.yaml"), "utf8"));

function renderTemplate(str, vars = {}) {
  return String(str || "").replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? vars[key] : `{${key}}`));
}

function notificationText(type, vars = {}) {
  const entry = NOTIFICATIONS[type] || {};
  return {
    title: renderTemplate(entry.title, vars),
    body: renderTemplate(entry.body, vars),
    link: entry.link || "/?tab=session",
  };
}

function getLocalDateParts(date = new Date(), timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    time: `${byType.hour}:${byType.minute}`,
    minutes: Number(byType.hour) * 60 + Number(byType.minute),
  };
}

function parseReminderMinutes(reminderTime) {
  if (typeof reminderTime !== "string" || !/^\d{2}:\d{2}$/.test(reminderTime)) return null;
  const [hour, minute] = reminderTime.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  return hour * 60 + minute;
}

function isReminderDue(reminderTime, currentMinutes) {
  const targetMinutes = parseReminderMinutes(reminderTime);
  if (targetMinutes == null) return false;
  const delta = currentMinutes - targetMinutes;
  return delta >= 0 && delta < REMINDER_WINDOW_MINUTES;
}

function getEnabledTypes(data = {}) {
  return { ...REMINDER_TYPES, ...(data.types || {}) };
}

function normalizeTokens(data = {}) {
  return Array.from(new Set([
    ...(Array.isArray(data.tokens) ? data.tokens : []),
    ...(data.token ? [data.token] : []),
  ].filter(Boolean)));
}

function exerciseHasTrainingSignal(exercise = {}) {
  if (!exercise || typeof exercise !== "object") return false;
  if (exercise.done === true) return true;

  const noteFields = [exercise.notes, exercise.comment, exercise.feedback]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  if (/(done|completed|train|trained|workout|session|sent|yes|ja)/.test(noteFields)) return true;

  const numericFields = [exercise.sets, exercise.reps, exercise.weight, exercise.rpe, exercise.duration];
  if (numericFields.some((value) => Number(value) > 0)) return true;

  const setsArray = Array.isArray(exercise.setsArray) ? exercise.setsArray : [];
  return setsArray.some((set) => Number(set?.reps) > 0 || Number(set?.weight) > 0 || Number(set?.rpe) > 0);
}

async function getSessionsForDate(userRef, date) {
  const snap = await userRef.collection("sessions").where("date", "==", date).get();
  return snap.docs.map((doc) => doc.data() || {});
}

async function hasCompletedTrainingToday(userRef, date) {
  const sessions = await getSessionsForDate(userRef, date);
  return sessions.some((session) =>
    Array.isArray(session.exercises) && session.exercises.some((exercise) => exerciseHasTrainingSignal(exercise))
  );
}

function parseIsoMillis(value) {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

async function getActiveWorkoutReminderCandidate(userRef, now = Date.now()) {
  const snap = await userRef.collection("sessions").orderBy("date", "desc").limit(20).get();
  let candidate = null;

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const gate = data.sessionGate || {};
    const startedAtMs = parseIsoMillis(gate.startedAt);
    if (!startedAtMs) continue;
    if (gate.endedAt) continue;
    if (gate.reminderSentAt) continue;
    const elapsedMs = now - startedAtMs;
    if (elapsedMs < 60 * 60 * 1000) continue;
    if (!candidate || startedAtMs > candidate.startedAtMs) {
      candidate = { ref: doc.ref, data, startedAtMs, elapsedMs };
    }
  }

  return candidate;
}

async function getDaysSinceLastCompletedTraining(userRef, todayDate) {
  const snap = await userRef.collection("sessions").orderBy("date", "desc").limit(120).get();
  const today = new Date(`${todayDate}T12:00:00`);
  for (const doc of snap.docs) {
    const session = doc.data() || {};
    const date = session.date;
    if (!date) continue;
    const exercises = Array.isArray(session.exercises) ? session.exercises : [];
    if (!exercises.some((exercise) => exerciseHasTrainingSignal(exercise))) continue;
    const last = new Date(`${date}T12:00:00`);
    return Math.floor((today - last) / 86400000);
  }
  return null;
}

function getCoverageGaps(scores = {}, threshold = COVERAGE_GAP_THRESHOLD) {
  return Object.keys(MUSCLE_GROUP_LABELS).filter((id) => Number(scores[id] || 0) < threshold);
}

async function getCoverageScores(userRef) {
  const snap = await userRef.collection("analytics").doc("dashboard").get();
  if (!snap.exists) return {};
  const data = snap.data() || {};
  return data.rolling_7_days?.body_region_scores || {};
}

async function getOpenHabitsToday(userRef, date) {
  const [habitsSnap, recordsSnap] = await Promise.all([
    userRef.collection("habits").get(),
    userRef.collection("habitRecords").where("date", "==", date).where("completion", "==", "DONE").get(),
  ]);
  const doneIds = new Set(recordsSnap.docs.map((doc) => doc.data().habitId));
  return habitsSnap.docs
    .map((doc) => ({ uuid: doc.id, ...doc.data() }))
    .filter((habit) => !habit.deleted && !doneIds.has(habit.uuid));
}

async function sendReminder(uid, tokens, title, body, link) {
  if (!tokens || tokens.length === 0) return { sentCount: 0, failureCount: 0 };

  try {
    const message = {
      data: {
        title,
        body,
        link: link || "/?tab=session",
        tag: "fitness-reminder",
      },
      tokens,
    };
    const response = await admin.messaging().sendEachForMulticast(message);
    return {
      sentCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error(`Error sending reminders to ${uid}:`, error);
    return { sentCount: 0, failureCount: tokens.length, error: error.message };
  }
}

exports.scheduledPushReminders = functions
  .region("europe-west1")
  .pubsub.schedule("every 5 minutes")
  .timeZone(TIME_ZONE)
  .onRun(async () => {
    const { date, minutes } = getLocalDateParts();
    const db = admin.firestore();
    let sentCount = 0;
    let failureCount = 0;

    try {
      // Direkter Scan über fitness/{uid} statt collectionGroup("push") — "push"
      // ist im Datenmodell eine Dokument-ID unter settings/, keine eigene
      // Collection, ein collectionGroup-Query fand hier nie etwas (Bug, siehe
      // functions/notifications.yaml-Nachbarcommit).
      const userRefs = await db.collection("fitness").listDocuments();

      for (const userRef of userRefs) {
        const uid = userRef.id;
        const pushSnap = await userRef.collection("settings").doc("push").get();
        if (!pushSnap.exists) continue;

        const data = pushSnap.data() || {};
        if (!data.enabled) continue;

        const tokens = normalizeTokens(data);
        if (tokens.length === 0) continue;

        const types = getEnabledTypes(data);
        const notifications = [];

        if (types.activeWorkout) {
          const candidate = await getActiveWorkoutReminderCandidate(userRef);
          if (candidate) {
            const elapsedMinutes = Math.max(60, Math.round(candidate.elapsedMs / 60000));
            notifications.push({
              ...notificationText("activeWorkout", { minutes: elapsedMinutes }),
              _sessionRef: candidate.ref,
            });
          }
        }

        if (!isReminderDue(data.reminderTime, minutes) && notifications.length === 0) continue;

        if (types.restday) {
          const daysSince = await getDaysSinceLastCompletedTraining(userRef, date);
          if (daysSince != null && daysSince >= REST_DAY_THRESHOLD_DAYS) {
            notifications.push(notificationText("restday", { days: daysSince }));
          }
        }

        // Workout-Reminder nur wenn Rest-Day-Check nicht schon gefeuert hat —
        // sonst bekommt der User bei "lange nicht trainiert" zwei sich
        // überschneidende Pushes zur selben Minute.
        if (types.workout && notifications.length === 0) {
          const trained = await hasCompletedTrainingToday(userRef, date);
          if (!trained) notifications.push(notificationText("workout"));
        }

        if (types.coverage) {
          const scores = await getCoverageScores(userRef);
          const gaps = getCoverageGaps(scores);
          if (gaps.length > 0) {
            const regions = gaps.map((id) => MUSCLE_GROUP_LABELS[id] || id).join(", ");
            notifications.push(notificationText("coverage", { regions }));
          }
        }

        if (types.habit) {
          const openHabits = await getOpenHabitsToday(userRef, date);
          if (openHabits.length > 0) {
            const names = openHabits.map((h) => h.name).filter(Boolean).slice(0, 3).join(", ");
            notifications.push(notificationText("habit", { names: names || `${openHabits.length} Habit(s)` }));
          }
        }

        for (const notification of notifications) {
          const result = await sendReminder(uid, tokens, notification.title, notification.body, notification.link);
          sentCount += result.sentCount || 0;
          failureCount += result.failureCount || 0;
          if ((result.sentCount || 0) > 0 && notification._sessionRef) {
            await notification._sessionRef.set({
              sessionGate: {
                reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
              },
            }, { merge: true });
          }
        }
      }

      console.log(`Push reminders: ${sentCount} sent, ${failureCount} failed`);
      return { sentCount, failureCount };
    } catch (error) {
      console.error("Error in scheduledPushReminders:", error);
      return { error: error.message };
    }
  });

exports.onCoachFeedback = functions
  .region("europe-west1")
  .firestore.document("fitness/{uid}/sessions/{sid}")
  .onWrite(async (change, context) => {
    const { uid } = context.params;
    const newData = change.after.data() || {};
    const oldData = change.before.data() || {};

    if (!newData.coachFeedback || newData.coachFeedback === oldData.coachFeedback) {
      return null;
    }

    const db = admin.firestore();
    const pushDoc = await db.collection("fitness").doc(uid).collection("settings").doc("push").get();
    const pushData = pushDoc.data() || {};

    if (!pushData.enabled) return null;

    const tokens = normalizeTokens(pushData);
    if (tokens.length === 0) return null;

    const text = notificationText("coachFeedback");
    return sendReminder(uid, tokens, text.title, newData.coachFeedback.substring(0, 100), text.link);
  });

// Coach stellt einem Klienten einen Trainingsplan bereit (oder erneut bereit):
// Push an die Geräte des Klienten. Entwürfe, eigene Pläne und unveränderte
// Updates (z.B. Hinweis-Text, Wochentage) lösen nichts aus — nur ein neuer
// publishedAt-Stand.
exports.onPlanPublished = functions
  .region("europe-west1")
  .firestore.document("fitness/{uid}/macrocycles/{cid}")
  .onWrite(async (change, context) => {
    const { uid } = context.params;
    const after = change.after.data();
    if (!shouldNotifyPlanPublished(uid, change.before.data(), after)) return null;

    const pushDoc = await admin.firestore().collection("fitness").doc(uid).collection("settings").doc("push").get();
    const pushData = pushDoc.data() || {};
    if (!pushData.enabled || getEnabledTypes(pushData).plan === false) return null;

    const tokens = normalizeTokens(pushData);
    if (tokens.length === 0) return null;

    const text = notificationText("planPublished", { plan: after.name || "Trainingsplan" });
    return sendReminder(uid, tokens, text.title, text.body, text.link);
  });

// ── Strava-Live-Import (Radtouren-Tab, Prod/Firebase-PWA) ──────────────────
// Logik in strava.js — dev-Pendant ist server.mjs/strava-routes.mjs
// (Node-Backend, nur lokal erreichbar). Setup: docs/STRAVA_SETUP.md.
function requireAuth(context) {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login erforderlich.");
  return context.auth.uid;
}

exports.stravaAuthorizeUrl = functions
  .region(strava.REGION)
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const url = await strava.buildAuthorizeUrl(admin.firestore(), uid);
    return { url };
  });

exports.stravaCallback = functions
  .region(strava.REGION)
  .https.onRequest(async (req, res) => {
    const { code, state, error } = req.query;
    if (error) return res.redirect(`${strava.APP_URL}/#tours?strava_error=${encodeURIComponent(String(error))}`);
    if (!code || !state) return res.status(400).send("Strava: code/state fehlt im Callback.");
    try {
      await strava.exchangeCodeForTokens(admin.firestore(), { code: String(code), state: String(state) });
      return res.redirect(`${strava.APP_URL}/#tours?strava_connected=1`);
    } catch (err) {
      console.error("[stravaCallback]", err);
      return res.redirect(`${strava.APP_URL}/#tours?strava_error=${encodeURIComponent(err.message)}`);
    }
  });

exports.stravaStatus = functions
  .region(strava.REGION)
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    return strava.status(admin.firestore(), uid);
  });

exports.stravaActivities = functions
  .region(strava.REGION)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const tours = await strava.fetchActivities(admin.firestore(), uid, { perPage: data?.perPage || 30 });
    return { tours };
  });

exports.stravaDisconnect = functions
  .region(strava.REGION)
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    await strava.disconnect(admin.firestore(), uid);
    return { ok: true };
  });
