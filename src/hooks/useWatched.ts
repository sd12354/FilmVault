import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { WatchedItem } from '@/types'

export function useRecentWatches(userId?: string, limitCount: number = 20) {
  const { user } = useAuthStore()
  const targetUserId = userId || user?.uid

  return useQuery({
    queryKey: ['recent-watches', targetUserId, limitCount],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID required')
      if (!db) throw new Error('Firestore not initialized')

      try {
        // Try query with orderBy first (requires composite index)
        const watchesSnapshot = await getDocs(
          query(
            collection(db, 'watched'),
            where('userId', '==', targetUserId),
            orderBy('watchedAt', 'desc'),
            limit(limitCount)
          )
        )

        const watches = watchesSnapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            ...data,
            watchedAt: (data.watchedAt as Timestamp)?.toDate() || new Date(),
          } as WatchedItem
        })

        return watches
      } catch (error: any) {
        // If index error, fallback to query without orderBy and sort in memory
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          console.warn('Composite index required. Using fallback query without orderBy.')
          
          const watchesSnapshot = await getDocs(
            query(
              collection(db, 'watched'),
              where('userId', '==', targetUserId)
            )
          )

          const watches = watchesSnapshot.docs.map((docSnap) => {
            const data = docSnap.data()
            return {
              id: docSnap.id,
              ...data,
              watchedAt: (data.watchedAt as Timestamp)?.toDate() || new Date(),
            } as WatchedItem
          })


          // Sort by watchedAt descending and limit
          return watches
            .sort((a, b) => b.watchedAt.getTime() - a.watchedAt.getTime())
            .slice(0, limitCount)
        }
        
        // Re-throw other errors
        throw error
      }
    },
    enabled: !!targetUserId,
  })
}

export function useAddWatched() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      movieId,
      title,
      year,
      poster,
      type = 'movie',
      streamingService,
      rating,
      notes,
    }: {
      movieId: string
      title: string
      year?: number
      poster?: string
      type?: 'movie' | 'tv'
      streamingService?: string
      rating?: number
      notes?: string
    }) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      await addDoc(collection(db, 'watched'), {
        userId: user.uid,
        movieId,
        title,
        year,
        poster,
        type,
        streamingService: streamingService || 'Physical',
        watchedAt: serverTimestamp(),
        rating,
        notes,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-watches'] })
    },
  })
}

export function useRemoveWatched() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (watchedId: string) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      // Verify ownership by reading the document first
      const watchedDocRef = doc(db, 'watched', watchedId)
      const watchedDocSnap = await getDoc(watchedDocRef)

      if (!watchedDocSnap.exists()) {
        throw new Error('Watched item not found')
      }

      const data = watchedDocSnap.data()
      if (data.userId !== user.uid) {
        throw new Error('Unauthorized')
      }

      await deleteDoc(watchedDocRef)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-watches'] })
    },
  })
}

