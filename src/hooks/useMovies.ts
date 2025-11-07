import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { MovieItem, UserMeta } from '@/types'

export function useMovies(collectionId: string) {
  return useQuery({
    queryKey: ['movies', collectionId],
    queryFn: async () => {
      if (!db) throw new Error('Firestore not initialized')
      const snapshot = await getDocs(
        query(
          collection(db, 'collections', collectionId, 'items'),
          orderBy('addedAt', 'desc')
        )
      )
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          type: data.type || 'movie', // Default to 'movie' for backward compatibility
          addedAt: (data.addedAt as Timestamp)?.toDate() || new Date(),
          updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
        } as MovieItem
      })
    },
    enabled: !!collectionId,
  })
}

export function useMovie(collectionId: string, movieId: string) {
  return useQuery({
    queryKey: ['movie', collectionId, movieId],
    queryFn: async () => {
      if (!db) throw new Error('Firestore not initialized')
      const docSnap = await getDoc(
        doc(db, 'collections', collectionId, 'items', movieId)
      )
      if (!docSnap.exists()) throw new Error('Movie not found')

      const data = docSnap.data()
      return {
        id: docSnap.id,
        ...data,
        type: data.type || 'movie', // Default to 'movie' for backward compatibility
        addedAt: (data.addedAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
      } as MovieItem
    },
    enabled: !!collectionId && !!movieId,
  })
}

export function useUserMeta(collectionId: string, movieId: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['user-meta', collectionId, movieId, user?.uid],
    queryFn: async () => {
      if (!user) return null

      if (!db) return null

      const docSnap = await getDoc(
        doc(
          db,
          'collections',
          collectionId,
          'items',
          movieId,
          'userMeta',
          user.uid
        )
      )
      if (!docSnap.exists()) return null

      return docSnap.data() as UserMeta
    },
    enabled: !!collectionId && !!movieId && !!user,
  })
}

// Helper function to recursively remove undefined values from an object
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {}
  for (const key in obj) {
    const value = obj[key]
    if (value === undefined) {
      continue // Skip undefined values
    }
    
    // Recursively clean nested objects
    // Check if it's a plain object (not Date, Array, etc.)
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value.constructor === Date)
    ) {
      const cleanedNested = removeUndefined(value as Record<string, any>)
      // Only add if the nested object has at least one property
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested as any
      }
    } else {
      cleaned[key] = value
    }
  }
  return cleaned
}

export function useAddMovie() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      collectionId,
      movieData,
    }: {
      collectionId: string
      movieData: Omit<MovieItem, 'id' | 'addedAt' | 'updatedAt'>
    }) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      // Remove undefined values before adding to Firestore
      const cleanedData = removeUndefined(movieData)

      const itemRef = await addDoc(
        collection(db, 'collections', collectionId, 'items'),
        {
          ...cleanedData,
          addedBy: user.uid,
          addedAt: serverTimestamp(),
          updatedBy: user.uid,
          updatedAt: serverTimestamp(),
        }
      )

      // Update collection item count
      const collectionRef = doc(db, 'collections', collectionId)
      const collectionSnap = await getDoc(collectionRef)
      if (collectionSnap.exists()) {
        const currentCount = collectionSnap.data().itemCount || 0
        await updateDoc(collectionRef, {
          itemCount: currentCount + 1,
        })
      }

      return itemRef.id
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['movies', variables.collectionId] })
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}

export function useUpdateMovie() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      collectionId,
      movieId,
      updates,
    }: {
      collectionId: string
      movieId: string
      updates: Partial<MovieItem>
    }) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      await updateDoc(
        doc(db, 'collections', collectionId, 'items', movieId),
        {
          ...updates,
          updatedBy: user.uid,
          updatedAt: serverTimestamp(),
        }
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['movie', variables.collectionId, variables.movieId],
      })
      queryClient.invalidateQueries({
        queryKey: ['movies', variables.collectionId],
      })
    },
  })
}

export function useUpdateUserMeta() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      collectionId,
      movieId,
      meta,
    }: {
      collectionId: string
      movieId: string
      meta: Partial<UserMeta>
    }) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      const metaRef = doc(
        db,
        'collections',
        collectionId,
        'items',
        movieId,
        'userMeta',
        user.uid
      )

      const metaSnap = await getDoc(metaRef)
      if (metaSnap.exists()) {
        await updateDoc(metaRef, meta)
      } else {
        await addDoc(
          collection(
            db,
            'collections',
            collectionId,
            'items',
            movieId,
            'userMeta'
          ),
          {
            uid: user.uid,
            ...meta,
          }
        )
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['user-meta', variables.collectionId, variables.movieId],
      })
    },
  })
}

