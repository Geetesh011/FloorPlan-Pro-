/**
 * saveLoad.js — Firestore helpers for FloorPlan Pro.
 *
 * Schema (legacy, anonymous):
 *   floorplans/{userId}/designs/{designId}
 *
 * Schema (new, authenticated):
 *   projects/{projectId}
 *     ownerId        : string  (Firebase Auth uid)
 *     name           : string
 *     createdAt      : Timestamp
 *     lastEdited     : Timestamp
 *     roomData       : { rooms, placedFurniture, doors }
 */
import { db } from '../firebase';
import {
  collection, doc,
  setDoc, getDoc, getDocs, deleteDoc, addDoc, updateDoc,
  serverTimestamp, query, orderBy, where,
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

// ── Save (legacy anonymous) ───────────────────────────────────────────────
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

// ── List all designs (legacy, newest first) ───────────────────────────────
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

// ── Load one design (legacy) ───────────────────────────────────────────────
export async function loadDesign(userId, designId) {
  const snap = await getDoc(doc(db, 'floorplans', userId, 'designs', designId));
  if (!snap.exists()) throw new Error('Design not found');
  const { rooms, placedFurniture, doors } = snap.data();
  return { rooms: rooms ?? [], placedFurniture: placedFurniture ?? [], doors: doors ?? [] };
}

// ── Delete (legacy) ────────────────────────────────────────────────────────
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

// ════════════════════════════════════════════════════════════════════════════
// NEW — Authenticated projects collection
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create a new blank project owned by uid.
 * Returns the new Firestore document ID.
 */
export async function createProject(uid, name = 'Untitled Project') {
  const docRef = await addDoc(collection(db, 'projects'), {
    ownerId:    uid,
    name:       name.trim() || 'Untitled Project',
    createdAt:  serverTimestamp(),
    lastEdited: serverTimestamp(),
    roomData:   { rooms: [], placedFurniture: [], doors: [] },
  });
  return docRef.id;
}

/**
 * List all projects for a user, newest first.
 */
export async function listProjects(uid) {
  const q = query(
    collection(db, 'projects'),
    where('ownerId', '==', uid),
    orderBy('lastEdited', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id:         d.id,
    name:       d.data().name,
    createdAt:  d.data().createdAt?.toDate?.()  ?? null,
    lastEdited: d.data().lastEdited?.toDate?.() ?? null,
    thumbnailUrl: d.data().thumbnailUrl || null,
    roomCount:  (d.data().roomData?.rooms ?? []).length,
    itemCount:  (d.data().roomData?.placedFurniture ?? []).length,
  }));
}

/**
 * Load a project's full roomData.
 */
export async function loadProject(projectId) {
  const snap = await getDoc(doc(db, 'projects', projectId));
  if (!snap.exists()) throw new Error('Project not found');
  const data = snap.data();
  return {
    name:     data.name,
    ownerId:  data.ownerId,
    roomData: data.roomData ?? { rooms: [], placedFurniture: [], doors: [] },
  };
}

/**
 * Save (overwrite) a project's roomData + update lastEdited and optionally thumbnailUrl.
 */
export async function saveProject(projectId, roomData, thumbnailUrl = null) {
  const dataToUpdate = {
    roomData,
    lastEdited: serverTimestamp(),
  };
  
  if (thumbnailUrl) {
    dataToUpdate.thumbnailUrl = thumbnailUrl;
  }
  
  await updateDoc(doc(db, 'projects', projectId), dataToUpdate);
}

/**
 * Rename a project.
 */
export async function renameProject(projectId, name) {
  await updateDoc(doc(db, 'projects', projectId), { name: name.trim() });
}

/**
 * Delete a project.
 */
export async function deleteProject(projectId) {
  await deleteDoc(doc(db, 'projects', projectId));
}
