import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

export function useUser() {
  const { setUser } = useAuthStore()

  const fetchUser = async (uid: string) => {
    if (!db) {
      console.warn('Firestore not initialized')
      return
    }

    // Always read fresh auth user from the store. App's auth listener calls
    // setFirebaseUser before fetchUser, but fetchUser must not rely on a hook
    // closure from the first render (it would stay null for new Google users).
    const firebaseUser = useAuthStore.getState().firebaseUser

    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setUser({
          uid,
          displayName: data.displayName,
          email: data.email,
          photoURL: data.photoURL,
          createdAt: data.createdAt?.toDate() || new Date(),
          defaultCollectionId: data.defaultCollectionId,
        })
      } else if (firebaseUser && firebaseUser.uid === uid) {
        // Create user document if it doesn't exist
        try {
          const newUser: Omit<User, 'uid'> = {
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            createdAt: new Date(),
          }
          await setDoc(doc(db, 'users', uid), {
            ...newUser,
            createdAt: serverTimestamp(),
          })
          setUser({ uid, ...newUser })
        } catch (error) {
          console.error('Error creating user document:', error)
          // Still set user even if document creation fails
          setUser({
            uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            createdAt: new Date(),
          })
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  return { fetchUser }
}

