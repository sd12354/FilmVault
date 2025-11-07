import { useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, updateDoc } from 'firebase/firestore'
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, auth, storage } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { firebaseUser, setUser, user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      displayName,
      photoURL,
    }: {
      displayName?: string | null
      photoURL?: string | null
    }) => {
      if (!firebaseUser) throw new Error('Not authenticated')
      if (!db) throw new Error('Firestore not initialized')

      // Update Firebase Auth profile
      const updates: { displayName?: string | null; photoURL?: string | null } = {}
      if (displayName !== undefined) updates.displayName = displayName
      if (photoURL !== undefined) updates.photoURL = photoURL

      await updateProfile(firebaseUser, updates)

      // Update Firestore user document
      await updateDoc(doc(db, 'users', firebaseUser.uid), updates)

      // Update local state
      if (user) {
        setUser({
          ...user,
          displayName: displayName ?? user.displayName,
          photoURL: photoURL ?? user.photoURL,
        })
      }

      return { displayName, photoURL }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    },
  })
}

export function useUploadProfilePicture() {
  const { firebaseUser } = useAuthStore()
  const updateProfile = useUpdateProfile()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!firebaseUser) throw new Error('Not authenticated')
      if (!storage) throw new Error('Storage not initialized')

      // Delete old profile picture if it exists and is in Firebase Storage
      if (firebaseUser.photoURL && firebaseUser.photoURL.includes('firebasestorage')) {
        try {
          // Extract the path from the URL
          // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
          const url = new URL(firebaseUser.photoURL)
          const pathMatch = url.pathname.match(/\/o\/(.+)\?/)
          if (pathMatch) {
            const decodedPath = decodeURIComponent(pathMatch[1])
            const oldPhotoRef = ref(storage, decodedPath)
            await deleteObject(oldPhotoRef)
          }
        } catch (error) {
          // Ignore errors deleting old photo
          console.warn('Could not delete old profile picture:', error)
        }
      }

      // Upload new profile picture
      const fileRef = ref(storage, `users/${firebaseUser.uid}/profile/${Date.now()}_${file.name}`)
      await uploadBytes(fileRef, file)

      // Get download URL
      const downloadURL = await getDownloadURL(fileRef)

      // Update profile with new photo URL
      await updateProfile.mutateAsync({ photoURL: downloadURL })

      return downloadURL
    },
  })
}

export function useChangePassword() {
  const { firebaseUser } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string
      newPassword: string
    }) => {
      if (!firebaseUser || !auth) throw new Error('Not authenticated')
      if (!auth.currentUser) throw new Error('Not authenticated')
      if (!firebaseUser.email) throw new Error('User email not found')

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)

      // Update password
      await updatePassword(auth.currentUser, newPassword)
    },
  })
}

