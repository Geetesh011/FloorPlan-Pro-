// firebase.js — Firebase app + Firestore initialisation
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore }            from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyBtQlEtBrNXWUwOzO-DPF7fYeLzHW6kqNk',
  authDomain:        'floorplan-pro-12512.firebaseapp.com',
  projectId:         'floorplan-pro-12512',
  storageBucket:     'floorplan-pro-12512.firebasestorage.app',
  messagingSenderId: '683544144235',
  appId:             '1:683544144235:web:ae4ef53f682f1c9551c42e',
  measurementId:     'G-6DP3HE7QFC',
};

// Guard against Vite HMR double-initialisation
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);