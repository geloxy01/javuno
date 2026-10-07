import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { ensureUserDoc } from "../lib/users";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0); // forces a re-render after the profile name changes
  const skipAuthSync = useRef(false); // true while signup() is creating the user doc itself

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && !skipAuthSync.current) {
        try {
          await ensureUserDoc(firebaseUser);
        } catch (err) {
          console.error(
            "Could not create user document. Are the Firestore rules published?",
            err,
          );
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signup(name, email, password) {
    skipAuthSync.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await ensureUserDoc(cred.user);
      setTick((t) => t + 1);
    } finally {
      skipAuthSync.current = false;
    }
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function loginWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  function logout() {
    return signOut(auth);
  }

  const value = useMemo(
    () => ({ user, loading, signup, login, loginWithGoogle, logout }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, tick],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
