/**
 * firestore/user.js — User settings, layout, body entries, and profile for Firestore.
 */

import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { setDoc, getDoc, getDocs } from "./offline.js";

import { db } from "../../../firebase.js";
import { getUid, hasAuthSession } from "./core.js";
import {
  getSettings as getLocalSettings,
  saveSettings as saveLocalSettings,
  getLayout as getLocalLayout,
  saveLayout as saveLocalLayout,
  getPushSettings as getLocalPushSettings,
  savePushSettings as saveLocalPushSettings,
  getBodyEntry as getLocalBodyEntry,
  saveBodyEntry as saveLocalBodyEntry,
  getBodyEntries as getLocalBodyEntries,
} from "../local/user.js";

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings() {
  if (!hasAuthSession()) return getLocalSettings();
  const snap = await getDoc(doc(db, "fitness", getUid(), "settings", "general"));
  if (!snap.exists()) return { theme: "honey", themeMode: "manual" };
  return snap.data();
}

export async function saveSettings(settings) {
  if (!hasAuthSession()) return saveLocalSettings(settings);
  await setDoc(doc(db, "fitness", getUid(), "settings", "general"), {
    ...settings,
    updated_at: serverTimestamp(),
  });
  return { ok: true };
}

// ── Layout ────────────────────────────────────────────────────────────────────

export async function getLayout() {
  if (!hasAuthSession()) return getLocalLayout();
  const snap = await getDoc(doc(db, "fitness", getUid(), "settings", "layout"));
  if (!snap.exists()) return null;
  return snap.data()?.layout;
}

export async function saveLayout(layout) {
  if (!hasAuthSession()) return saveLocalLayout(layout);
  await setDoc(doc(db, "fitness", getUid(), "settings", "layout"), {
    layout,
    updated_at: serverTimestamp(),
  });
  return { ok: true };
}

export async function getPushSettings() {
  if (!hasAuthSession()) return getLocalPushSettings();
  const snap = await getDoc(doc(db, "fitness", getUid(), "settings", "push"));
  if (!snap.exists()) {
    return {
      enabled: false,
      tokens: [],
      types: {},
      reminderTime: "18:00",
    };
  }
  const data = snap.data() || {};
  const tokens = Array.from(new Set([
    ...(Array.isArray(data.tokens) ? data.tokens : []),
    ...(data.token ? [data.token] : []),
  ].filter(Boolean)));
  return {
    enabled: false,
    types: {},
    reminderTime: "18:00",
    ...data,
    token: tokens[0] || data.token || null,
    tokens,
  };
}

export async function savePushSettings(settings) {
  if (!hasAuthSession()) return saveLocalPushSettings(settings);
  await setDoc(doc(db, "fitness", getUid(), "settings", "push"), {
    ...settings,
    tokens: Array.from(new Set([
      ...(Array.isArray(settings?.tokens) ? settings.tokens : []),
      ...(settings?.token ? [settings.token] : []),
    ].filter(Boolean))),
    updated_at: serverTimestamp(),
  });
  return { ok: true };
}

// ── Body entries ──────────────────────────────────────────────────────────────

export async function getBodyEntry(date) {
  if (!hasAuthSession()) return getLocalBodyEntry(date);
  const snap = await getDoc(doc(db, "fitness", getUid(), "body", date));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function saveBodyEntry(date, data) {
  if (!hasAuthSession()) return saveLocalBodyEntry(date, data);
  await setDoc(doc(db, "fitness", getUid(), "body", date), {
    ...data,
    date,
    saved_at: serverTimestamp(),
  });
  return { ok: true };
}

export async function getBodyEntries(days = 30) {
  if (!hasAuthSession()) return getLocalBodyEntries(days);
  const q = query(
    collection(db, "fitness", getUid(), "body"),
    orderBy("date", "desc"),
    limit(days),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// ── User profile ──────────────────────────────────────────────────────────────

export async function getUserProfile(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, "fitness", uid, "profile", "metadata"));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("Fehler beim Laden des Profils:", error);
    return null;
  }
}

export async function updateUserProfile(uid, data) {
  if (!uid) return false;
  try {
    await setDoc(doc(db, "fitness", uid, "profile", "metadata"), {
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Fehler beim Speichern des Profils:", error);
    return false;
  }
}
