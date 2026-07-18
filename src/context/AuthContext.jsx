import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Do not persist auth across browser restarts/tabs
setPersistence(auth, browserSessionPersistence)
  .catch((error) => console.error("Error setting persistence:", error));

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  // true while Firebase is resolving the persisted session on first load
  const [loading, setLoading] = useState(true);

  // Signup: create account then set displayName
  async function signup(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    return cred;
  }

  // Login
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Google Login
  function loginWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  // Logout → caller handles redirect
  function logout() {
    return signOut(auth);
  }

  // Subscribe to Firebase Auth state once on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, loading, signup, login, loginWithGoogle, logout };


  // Don't render children until Firebase has resolved the session —
  // prevents a flash of the /login redirect for already-logged-in users.
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
