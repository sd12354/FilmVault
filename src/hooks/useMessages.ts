import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { MovieItem } from '@/types'

export interface MovieMessage {
  id: string
  senderUid: string
  senderName?: string
  senderPhotoURL?: string
  recipientUid: string
  movies: Array<{
    movieId: string
    title: string
    year?: number
    poster?: string
    type?: 'movie' | 'tv'
  }>
  message?: string
  read: boolean
  createdAt: Date
}

export function useSendMovies() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      recipientUid,
      movies,
      message,
    }: {
      recipientUid: string
      movies: Array<{
        movieId: string
        title: string
        year?: number
        poster?: string
        type?: 'movie' | 'tv'
      }>
      message?: string
    }) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')
      if (movies.length === 0) throw new Error('Please select at least one movie')

      // Clean movies array - remove undefined values
      const cleanedMovies = movies.map(movie => {
        const cleaned: any = {
          movieId: movie.movieId,
          title: movie.title,
        }
        if (movie.year !== undefined) cleaned.year = movie.year
        if (movie.poster !== undefined) cleaned.poster = movie.poster
        if (movie.type !== undefined) cleaned.type = movie.type
        return cleaned
      })

      // Prepare message data
      const messageData: any = {
        senderUid: user.uid,
        recipientUid,
        movies: cleanedMovies,
        read: false,
        createdAt: serverTimestamp(),
      }
      
      // Add optional fields only if they exist
      if (user.displayName) messageData.senderName = user.displayName
      if (user.photoURL) messageData.senderPhotoURL = user.photoURL
      if (message && message.trim()) messageData.message = message.trim()

      await addDoc(collection(db, 'messages'), messageData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })
}

export function useMessages() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['messages', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      try {
        const messagesSnapshot = await getDocs(
          query(
            collection(db, 'messages'),
            where('recipientUid', '==', user.uid),
            orderBy('createdAt', 'desc')
          )
        )

        return messagesSnapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          } as MovieMessage
        })
      } catch (error: any) {
        // If index error, try without orderBy
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          console.warn('Composite index required. Using query without orderBy.')
          const messagesSnapshot = await getDocs(
            query(
              collection(db, 'messages'),
              where('recipientUid', '==', user.uid)
            )
          )

          const messages = messagesSnapshot.docs.map((docSnap) => {
            const data = docSnap.data()
            return {
              id: docSnap.id,
              ...data,
              createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            } as MovieMessage
          })

          // Sort manually
          return messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        }
        throw error
      }
    },
    enabled: !!user,
  })
}

export function useMarkMessageAsRead() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      await updateDoc(doc(db, 'messages', messageId), {
        read: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })
}

