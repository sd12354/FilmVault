import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type { Collection, CollectionMember, MemberRole } from '@/types'

export function useCollections() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['collections', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      // Get collections where user is owner
      // Try with orderBy first, fall back to without if index doesn't exist
      let ownerSnapshot
      try {
        const ownerQuery = query(
          collection(db, 'collections'),
          where('ownerUid', '==', user.uid),
          where('archived', '==', false),
          orderBy('createdAt', 'desc')
        )
        ownerSnapshot = await getDocs(ownerQuery)
      } catch (error: any) {
        // If index error, try without orderBy
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          console.warn('Composite index required. Using query without orderBy.')
          const ownerQuery = query(
            collection(db, 'collections'),
            where('ownerUid', '==', user.uid),
            where('archived', '==', false)
          )
          ownerSnapshot = await getDocs(ownerQuery)
        } else {
          throw error
        }
      }

      const ownerCollections: Collection[] = ownerSnapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
        } as Collection
      })

      // Member collections require a different approach since we can't query by subcollection
      // For now, only returning owner collections
      const memberCollections: Collection[] = []

      return [...ownerCollections, ...memberCollections]
    },
    enabled: !!user,
  })
}

export function useCreateCollection() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      const collectionRef = await addDoc(collection(db, 'collections'), {
        ownerUid: user.uid,
        name,
        createdAt: serverTimestamp(),
        archived: false,
        visibility: 'private',
        memberCount: 1,
        itemCount: 0,
      })

      // Add owner as member (use setDoc with user.uid as document ID)
      await setDoc(
        doc(db, 'collections', collectionRef.id, 'members', user.uid),
        {
          uid: user.uid,
          role: 'owner',
          invitedBy: user.uid,
          invitedAt: serverTimestamp(),
          acceptedAt: serverTimestamp(),
        }
      )

      return collectionRef.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}

export function useCollection(collectionId: string) {
  return useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      if (!db) throw new Error('Firestore not initialized')
      const docSnap = await getDoc(doc(db, 'collections', collectionId))
      if (!docSnap.exists()) throw new Error('Collection not found')

      const data = docSnap.data()
      return {
        id: docSnap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      } as Collection
    },
  })
}

export function useCollectionMembers(collectionId: string) {
  return useQuery({
    queryKey: ['collection-members', collectionId],
    queryFn: async () => {
      if (!db) throw new Error('Firestore not initialized')
      const membersSnapshot = await getDocs(
        collection(db, 'collections', collectionId, 'members')
      )
      return membersSnapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          uid: docSnap.id,
          ...data,
          invitedAt: (data.invitedAt as Timestamp)?.toDate() || new Date(),
          acceptedAt: data.acceptedAt
            ? (data.acceptedAt as Timestamp).toDate()
            : null,
        } as CollectionMember
      })
    },
  })
}

export function useDeleteCollection() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (collectionId: string) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      // Verify user is the owner
      const collectionDoc = await getDoc(doc(db, 'collections', collectionId))
      if (!collectionDoc.exists()) {
        throw new Error('Collection not found')
      }
      if (collectionDoc.data().ownerUid !== user.uid) {
        throw new Error('Only the owner can delete a collection')
      }

      if (!db) throw new Error('Firestore not initialized')
      const firestore = db // TypeScript now knows db is not null

      // Delete all items in the collection
      const itemsSnapshot = await getDocs(
        collection(firestore, 'collections', collectionId, 'items')
      )
      const deletePromises = itemsSnapshot.docs.map((itemDoc) =>
        deleteDoc(doc(firestore, 'collections', collectionId, 'items', itemDoc.id))
      )

      // Delete all members
      const membersSnapshot = await getDocs(
        collection(firestore, 'collections', collectionId, 'members')
      )
      const deleteMemberPromises = membersSnapshot.docs.map((memberDoc) =>
        deleteDoc(doc(firestore, 'collections', collectionId, 'members', memberDoc.id))
      )

      // Wait for all deletions
      await Promise.all([...deletePromises, ...deleteMemberPromises])

      // Finally delete the collection itself
      await deleteDoc(doc(firestore, 'collections', collectionId))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}

export function useDuplicateCollection() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ collectionId, newName }: { collectionId: string; newName?: string }) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')
      const firestore = db // TypeScript now knows db is not null

      // Get the original collection
      const collectionDoc = await getDoc(doc(firestore, 'collections', collectionId))
      if (!collectionDoc.exists()) {
        throw new Error('Collection not found')
      }
      const originalData = collectionDoc.data()

      // Create new collection
      const newCollectionRef = await addDoc(collection(firestore, 'collections'), {
        ownerUid: user.uid,
        name: newName || `${originalData.name} (Copy)`,
        createdAt: serverTimestamp(),
        archived: false,
        visibility: originalData.visibility || 'private',
        memberCount: 1,
        itemCount: 0,
      })

      // Add owner as member
      await setDoc(
        doc(firestore, 'collections', newCollectionRef.id, 'members', user.uid),
        {
          uid: user.uid,
          role: 'owner',
          invitedBy: user.uid,
          invitedAt: serverTimestamp(),
          acceptedAt: serverTimestamp(),
        }
      )

      // Copy all items
      const itemsSnapshot = await getDocs(
        collection(firestore, 'collections', collectionId, 'items')
      )
      
      let itemCount = 0
      for (const itemDoc of itemsSnapshot.docs) {
        const itemData = itemDoc.data()
        const newItemRef = await addDoc(
          collection(firestore, 'collections', newCollectionRef.id, 'items'),
          {
            ...itemData,
            addedBy: user.uid,
            addedAt: serverTimestamp(),
            updatedBy: user.uid,
            updatedAt: serverTimestamp(),
          }
        )
        itemCount++

        // Copy user metadata if it exists
        try {
          const userMetaDoc = await getDoc(
            doc(firestore, 'collections', collectionId, 'items', itemDoc.id, 'userMeta', user.uid)
          )
          if (userMetaDoc.exists()) {
            const metaData = userMetaDoc.data()
            await setDoc(
              doc(
                firestore,
                'collections',
                newCollectionRef.id,
                'items',
                newItemRef.id,
                'userMeta',
                user.uid
              ),
              metaData
            )
          }
        } catch (error) {
          // Ignore errors copying metadata
          console.warn('Could not copy user metadata:', error)
        }
      }

      // Update item count
      await updateDoc(doc(firestore, 'collections', newCollectionRef.id), {
        itemCount,
      })

      return newCollectionRef.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      collectionId,
      friendUid,
      role = 'viewer' as MemberRole,
    }: {
      collectionId: string
      friendUid: string
      role?: MemberRole
    }) => {
      if (!user) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      // Verify user is the owner
      const collectionDoc = await getDoc(doc(db, 'collections', collectionId))
      if (!collectionDoc.exists()) {
        throw new Error('Collection not found')
      }
      if (collectionDoc.data().ownerUid !== user.uid) {
        throw new Error('Only the owner can invite members')
      }

      // Check if member already exists
      const memberDoc = await getDoc(
        doc(db, 'collections', collectionId, 'members', friendUid)
      )
      if (memberDoc.exists()) {
        throw new Error('User is already a member of this collection')
      }

      // Add member
      await setDoc(
        doc(db, 'collections', collectionId, 'members', friendUid),
        {
          uid: friendUid,
          role,
          invitedBy: user.uid,
          invitedAt: serverTimestamp(),
          acceptedAt: null,
        }
      )

      // Update member count
      const currentCount = collectionDoc.data().memberCount || 0
      await updateDoc(doc(db, 'collections', collectionId), {
        memberCount: currentCount + 1,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection-members', variables.collectionId] })
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })
}

