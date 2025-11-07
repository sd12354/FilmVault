import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { Friend, User } from '@/types'

export function useFriends() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['friends', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      // Get all friendships where current user is involved
      // Query by requesterUid OR recipientUid to catch all friendships
      // Try with status filter first, fall back if index doesn't exist
      let friendshipsSnapshot
      
      try {
        // Try querying as requester first
        const requesterQuery = query(
          collection(db, 'friendships'),
          where('requesterUid', '==', user.uid),
          where('status', '==', 'accepted')
        )
        const requesterSnapshot = await getDocs(requesterQuery)
        
        // Try querying as recipient
        const recipientQuery = query(
          collection(db, 'friendships'),
          where('recipientUid', '==', user.uid),
          where('status', '==', 'accepted')
        )
        const recipientSnapshot = await getDocs(recipientQuery)
        
        // Combine results and deduplicate
        const allDocs = [...requesterSnapshot.docs, ...recipientSnapshot.docs]
        const uniqueDocs = Array.from(
          new Map(allDocs.map((doc) => [doc.id, doc])).values()
        )
        
        friendshipsSnapshot = { docs: uniqueDocs } as typeof requesterSnapshot
      } catch (error: any) {
        // If index error, try without status filter and filter in code
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          console.warn('Composite index required. Using query without status filter.')
          
          // Query as requester
          const requesterQuery = query(
            collection(db, 'friendships'),
            where('requesterUid', '==', user.uid)
          )
          const requesterSnapshot = await getDocs(requesterQuery)
          
          // Query as recipient
          const recipientQuery = query(
            collection(db, 'friendships'),
            where('recipientUid', '==', user.uid)
          )
          const recipientSnapshot = await getDocs(recipientQuery)
          
          // Combine and filter
          const allDocs = [...requesterSnapshot.docs, ...recipientSnapshot.docs]
          const uniqueDocsMap = new Map(allDocs.map((doc) => [doc.id, doc]))
          const acceptedFriendships = Array.from(uniqueDocsMap.values()).filter((docSnap) => {
            const data = docSnap.data()
            return data.status === 'accepted'
          })
          
          friendshipsSnapshot = { docs: acceptedFriendships } as typeof requesterSnapshot
        } else {
          console.error('Error querying friendships:', error)
          throw error
        }
      }
      

      const friendUids = new Set<string>()
      const friendshipMap = new Map<string, typeof friendshipsSnapshot.docs[0]>()
      
      friendshipsSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data()
        const requesterUid = data.requesterUid
        const recipientUid = data.recipientUid
        
        friendshipMap.set(docSnap.id, docSnap)
        
        // Determine who the friend is based on requester/recipient
        if (requesterUid === user.uid && recipientUid !== user.uid) {
          // Current user is the requester, so the friend is the recipient
          friendUids.add(recipientUid)
          friendshipMap.set(recipientUid, docSnap)
        } else if (recipientUid === user.uid && requesterUid !== user.uid) {
          // Current user is the recipient, so the friend is the requester
          friendUids.add(requesterUid)
          friendshipMap.set(requesterUid, docSnap)
        }
      })


      // Fetch user details for each friend
      const friendPromises = Array.from(friendUids).map(async (uid) => {
        if (!db) throw new Error('Firestore not initialized')
        const userDoc = await getDoc(doc(db, 'users', uid))
        if (!userDoc.exists()) return null

        const userData = userDoc.data()
        // Get the friendship document to get friendSince date
        const friendshipDoc = friendshipMap.get(uid)

        return {
          uid,
          displayName: userData.displayName,
          email: userData.email,
          photoURL: userData.photoURL,
          createdAt: userData.createdAt?.toDate() || new Date(),
          friendSince: friendshipDoc
            ? (friendshipDoc.data().acceptedAt?.toDate() || 
               friendshipDoc.data().createdAt?.toDate() || 
               new Date())
            : new Date(),
        } as Friend
      })

      const friends = (await Promise.all(friendPromises)).filter(
        (f): f is Friend => f !== null
      )

      return friends.sort((a, b) => b.friendSince.getTime() - a.friendSince.getTime())
    },
    enabled: !!user,
  })
}

export function useFriendRequests() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['friend-requests', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      // Get pending requests where current user is the recipient
      const requestsSnapshot = await getDocs(
        query(
          collection(db, 'friendships'),
          where('recipientUid', '==', user.uid),
          where('status', '==', 'pending')
        )
      )

      const requests = await Promise.all(
        requestsSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data()
          const requesterUid = data.requesterUid

          if (!db) throw new Error('Firestore not initialized')
          const requesterDoc = await getDoc(doc(db, 'users', requesterUid))
          if (!requesterDoc.exists()) return null

          const requesterData = requesterDoc.data()
          return {
            id: docSnap.id,
            requester: {
              uid: requesterUid,
              displayName: requesterData.displayName,
              email: requesterData.email,
              photoURL: requesterData.photoURL,
            } as Partial<User>,
            createdAt: data.createdAt?.toDate() || new Date(),
          }
        })
      )

      return requests.filter((r) => r !== null)
    },
    enabled: !!user,
  })
}

export function useSentFriendRequests() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['sent-friend-requests', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      // Get pending requests where current user is the requester
      const requestsSnapshot = await getDocs(
        query(
          collection(db, 'friendships'),
          where('requesterUid', '==', user.uid),
          where('status', '==', 'pending')
        )
      )

      const requests = await Promise.all(
        requestsSnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data()
          const recipientUid = data.recipientUid

          if (!db) throw new Error('Firestore not initialized')
          const recipientDoc = await getDoc(doc(db, 'users', recipientUid))
          if (!recipientDoc.exists()) return null

          const recipientData = recipientDoc.data()
          return {
            id: docSnap.id,
            recipient: {
              uid: recipientUid,
              displayName: recipientData.displayName,
              email: recipientData.email,
              photoURL: recipientData.photoURL,
            } as Partial<User>,
            createdAt: data.createdAt?.toDate() || new Date(),
          }
        })
      )

      return requests.filter((r) => r !== null)
    },
    enabled: !!user,
  })
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (recipientUid: string) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      try {
        // Check if there's already an accepted friendship
        try {
          // Check as requester
          const requesterAccepted = await getDocs(
            query(
              collection(db, 'friendships'),
              where('requesterUid', '==', user.uid),
              where('recipientUid', '==', recipientUid),
              where('status', '==', 'accepted')
            )
          )
          
          // Check as recipient
          const recipientAccepted = await getDocs(
            query(
              collection(db, 'friendships'),
              where('requesterUid', '==', recipientUid),
              where('recipientUid', '==', user.uid),
              where('status', '==', 'accepted')
            )
          )

          if (!requesterAccepted.empty || !recipientAccepted.empty) {
            throw new Error('You are already friends with this user')
          }
        } catch (queryError: any) {
          if (queryError.code === 'permission-denied') {
            console.error('Permission denied on existingFriendships query:', queryError)
            throw new Error('Permission denied when checking existing friendships. Please make sure Firestore rules are deployed.')
          }
          // Re-throw if it's our custom error
          if (queryError.message === 'You are already friends with this user') {
            throw queryError
          }
          // For other errors, log but continue (might be index error)
          console.warn('Error checking existing friendships:', queryError)
        }

        // Check if there's already a pending request from current user
        try {
          const pendingSent = await getDocs(
            query(
              collection(db, 'friendships'),
              where('requesterUid', '==', user.uid),
              where('recipientUid', '==', recipientUid),
              where('status', '==', 'pending')
            )
          )

          if (!pendingSent.empty) {
            throw new Error('Friend request already sent')
          }
        } catch (queryError: any) {
          if (queryError.code === 'permission-denied') {
            console.error('Permission denied on pendingRequests query:', queryError)
            throw new Error('Permission denied when checking pending requests. Please make sure Firestore rules are deployed.')
          }
          // Re-throw if it's our custom error
          if (queryError.message === 'Friend request already sent') {
            throw queryError
          }
          // For other errors, log but continue
          console.warn('Error checking pending requests:', queryError)
        }

        // Check if there's a pending request from recipient to current user
        try {
          const pendingReceived = await getDocs(
            query(
              collection(db, 'friendships'),
              where('requesterUid', '==', recipientUid),
              where('recipientUid', '==', user.uid),
              where('status', '==', 'pending')
            )
          )

          if (!pendingReceived.empty) {
            throw new Error('This user has already sent you a friend request. Please check your friend requests.')
          }
        } catch (queryError: any) {
          if (queryError.code === 'permission-denied') {
            console.error('Permission denied on pendingReceived query:', queryError)
            throw new Error('Permission denied when checking pending requests. Please make sure Firestore rules are deployed.')
          }
          // Re-throw if it's our custom error
          if (queryError.message === 'This user has already sent you a friend request. Please check your friend requests.') {
            throw queryError
          }
          // For other errors, log but continue
          console.warn('Error checking pending received requests:', queryError)
        }

        // Create friend request
        try {
          await addDoc(collection(db, 'friendships'), {
            requesterUid: user.uid,
            recipientUid,
            users: [user.uid, recipientUid],
            status: 'pending',
            createdAt: serverTimestamp(),
          })
        } catch (createError: any) {
          console.error('Error creating friendship:', createError)
          if (createError.code === 'permission-denied') {
            throw new Error('Permission denied when creating friend request. Please make sure Firestore rules are deployed and you are signed in.')
          }
          throw createError
        }
      } catch (error: any) {
        // Provide more helpful error messages
        if (error.code === 'permission-denied') {
          throw new Error('Permission denied. Please make sure you are signed in and Firestore rules are deployed.')
        }
        if (error.code === 'unavailable') {
          throw new Error('Service temporarily unavailable. Please try again.')
        }
        // Re-throw other errors (like 'Friendship already exists')
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      queryClient.invalidateQueries({ queryKey: ['sent-friend-requests'] })
      queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      const requestDoc = await getDoc(doc(db, 'friendships', requestId))
      if (!requestDoc.exists()) {
        throw new Error('Friend request not found')
      }

      const data = requestDoc.data()
      if (data.recipientUid !== user.uid) {
        throw new Error('Unauthorized')
      }

      // Update status to accepted
      await setDoc(
        doc(db, 'friendships', requestId),
        {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
        },
        { merge: true }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      queryClient.invalidateQueries({ queryKey: ['sent-friend-requests'] })
      queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

export function useRejectFriendRequest() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      const requestDoc = await getDoc(doc(db, 'friendships', requestId))
      if (!requestDoc.exists()) {
        throw new Error('Friend request not found')
      }

      const data = requestDoc.data()
      // Allow deletion if user is recipient (rejecting) or requester (canceling)
      if (data.recipientUid !== user.uid && data.requesterUid !== user.uid) {
        throw new Error('Unauthorized')
      }

      // Delete the request
      await deleteDoc(doc(db, 'friendships', requestId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
      queryClient.invalidateQueries({ queryKey: ['sent-friend-requests'] })
      queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

export function useRemoveFriend() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (friendUid: string) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      // Find the friendship document
      const friendshipsSnapshot = await getDocs(
        query(
          collection(db, 'friendships'),
          where('users', 'array-contains', user.uid),
          where('status', '==', 'accepted')
        )
      )

      const friendshipDoc = friendshipsSnapshot.docs.find((docSnap) => {
        const data = docSnap.data()
        return (data.users || []).includes(friendUid)
      })

      if (friendshipDoc) {
        await deleteDoc(doc(db, 'friendships', friendshipDoc.id))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

export function useSearchUsers() {
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (searchQuery: string) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      if (!searchQuery.trim()) {
        return []
      }

      // Note: Firestore doesn't support full-text search, so we'll search by email
      // In a production app, you'd want to use Algolia or similar for better search
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const searchLower = searchQuery.toLowerCase()

      const users = usersSnapshot.docs
        .map((docSnap) => {
          const data = docSnap.data()
          return {
            uid: docSnap.id,
            displayName: data.displayName,
            email: data.email,
            photoURL: data.photoURL,
          } as Partial<User>
        })
        .filter((u) => {
          if (u.uid === user.uid) return false // Don't show current user
          const emailMatch = u.email?.toLowerCase().includes(searchLower)
          const nameMatch = u.displayName?.toLowerCase().includes(searchLower)
          return emailMatch || nameMatch
        })
        .slice(0, 10) // Limit results

      return users
    },
  })
}

