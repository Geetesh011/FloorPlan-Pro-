/**
 * saveLoad.js — Firestore helpers for FloorPlan Pro.
 *
 * Schema:
 *   floorplans/{userId}/designs/{designId}
 *     name         : string
 *     savedAt      : Timestamp
 *     rooms        : array
 *     placedFurniture : array
 *
 * userId is an anonymous UUID persisted in localStorage — no auth required.
 */
import { db } from '../firebase';
import {
  collection, doc,
  setDoc, getDoc, getDocs, deleteDoc, addDoc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';

// ── Anonymous user identity ───────────────────────────────────────────────
export function getOrCreateUserId() {
  const KEY = 'floorplan_user_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ── Save ──────────────────────────────────────────────────────────────────
export async function saveDesign(userId, name, rooms, placedFurniture, doors = []) {
  const designId = crypto.randomUUID();
  await setDoc(
    doc(db, 'floorplans', userId, 'designs', designId),
    {
      name:            name.trim() || 'Untitled Design',
      savedAt:         serverTimestamp(),
      rooms,
      placedFurniture,
      doors,
    }
  );
  return designId;
}

// ── List all designs (newest first) ───────────────────────────────────────
export async function listDesigns(userId) {
  const q    = query(
    collection(db, 'floorplans', userId, 'designs'),
    orderBy('savedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id:      d.id,
    name:    d.data().name,
    savedAt: d.data().savedAt?.toDate?.() ?? null,
    roomCount:     (d.data().rooms ?? []).length,
    furnitureCount:(d.data().placedFurniture ?? []).length,
  }));
}

// ── Load one design ───────────────────────────────────────────────────────
export async function loadDesign(userId, designId) {
  const snap = await getDoc(doc(db, 'floorplans', userId, 'designs', designId));
  if (!snap.exists()) throw new Error('Design not found');
  const { rooms, placedFurniture, doors } = snap.data();
  return { rooms: rooms ?? [], placedFurniture: placedFurniture ?? [], doors: doors ?? [] };
}

// ── Delete ────────────────────────────────────────────────────────────────
export async function deleteDesign(userId, designId) {
  await deleteDoc(doc(db, 'floorplans', userId, 'designs', designId));
}

// ── Shared Projects ───────────────────────────────────────────────────────
export async function createSharedProject(rooms, placedFurniture, doors) {
  const docRef = await addDoc(collection(db, 'sharedProjects'), {
    createdAt: serverTimestamp(),
    rooms,
    placedFurniture,
    doors,
  });
  return docRef.id;
}

export async function getSharedProject(projectId) {
  const snap = await getDoc(doc(db, 'sharedProjects', projectId));
  if (!snap.exists()) return null;
  return snap.data();
}
