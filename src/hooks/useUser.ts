import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

export function useUser() {
  const { firebaseUser, setUser } = useAuthStore()

  const fetchUser = async (uid: string) => {
    if (!db) {
      console.warn('Firestore not initialized')
      return
    }

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
      } else if (firebaseUser) {
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

