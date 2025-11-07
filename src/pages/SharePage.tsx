import { useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { useCollection, useCollectionMembers } from '@/hooks/useCollections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Share2, Mail, User, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function SharePage() {
  const { collectionId } = useParams<{ collectionId: string }>()
  const { data: collection } = useCollection(collectionId || '')
  const { data: members } = useCollectionMembers(collectionId || '')
  const { user } = useAuthStore()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'viewer' | 'contributor'>('viewer')

  const handleInvite = () => {
    if (!email.trim()) return
    // Note: Invite functionality requires user lookup by email
    // Currently, invites are handled through the Library page using friend UIDs
    alert('To invite members, go to Library and use the "Invite Friend" option from the collection menu.')
  }

  const handleRemoveMember = (uid: string) => {
    if (!collectionId || !uid) return
    // Note: Remove member functionality can be added here if needed
    // For now, members can be managed through the collection settings
    alert('Member removal functionality is available through collection settings.')
  }

  const isOwner = collection?.ownerUid === user?.uid

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Share Collection</h1>

        {collection && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{collection.name}</CardTitle>
              <CardDescription>
                {collection.itemCount} movies • {collection.memberCount} members
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Invite Section */}
        {isOwner && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Invite Members
              </CardTitle>
              <CardDescription>Invite others to view or edit your collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="viewer"
                      checked={role === 'viewer'}
                      onChange={(e) => setRole(e.target.value as 'viewer' | 'contributor')}
                      className="mr-2"
                    />
                    Viewer (read-only)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="contributor"
                      checked={role === 'contributor'}
                      onChange={(e) => setRole(e.target.value as 'viewer' | 'contributor')}
                      className="mr-2"
                    />
                    Contributor (can edit)
                  </label>
                </div>
              </div>
              <Button onClick={handleInvite} disabled={!email}>
                <Mail className="h-4 w-4 mr-2" />
                Send Invite
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <div className="font-medium">
                        {member.uid === user?.uid ? 'You' : member.uid}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {member.role}
                      </div>
                    </div>
                    {isOwner && member.uid !== user?.uid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.uid)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No members yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

