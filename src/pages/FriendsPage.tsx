import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import {
  useFriends,
  useFriendRequests,
  useSentFriendRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useRemoveFriend,
  useSearchUsers,
} from '@/hooks/useFriends'
import { useMessages, useMarkMessageAsRead } from '@/hooks/useMessages'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import SendMoviesModal from '@/components/SendMoviesModal'
import { getPosterUrl } from '@/lib/movieApi'
import {
  UserPlus,
  UserMinus,
  Check,
  X,
  Search,
  Users,
  UserCheck,
  AlertCircle,
  Loader2,
  MessageCircle,
  Film,
  Tv,
  Calendar,
  Star,
} from 'lucide-react'

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sendMoviesModal, setSendMoviesModal] = useState<{ uid: string; name?: string } | null>(null)
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null)
  const { data: friends, isLoading: friendsLoading, error: friendsError } = useFriends()
  const { data: friendRequests, isLoading: requestsLoading } = useFriendRequests()
  const { data: sentRequests, isLoading: sentRequestsLoading } = useSentFriendRequests()
  const { data: messages, isLoading: messagesLoading } = useMessages()
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()
  const rejectRequest = useRejectFriendRequest()
  const removeFriend = useRemoveFriend()
  const searchUsers = useSearchUsers()
  const markAsRead = useMarkMessageAsRead()

  const handleMessageClick = async (messageId: string) => {
    if (expandedMessageId === messageId) {
      setExpandedMessageId(null)
    } else {
      setExpandedMessageId(messageId)
      // Mark as read when expanded
      const message = messages?.find(m => m.id === messageId)
      if (message && !message.read) {
        try {
          await markAsRead.mutateAsync(messageId)
        } catch (error) {
          console.error('Failed to mark message as read:', error)
        }
      }
    }
  }

  // Get friend UIDs and pending request UIDs for filtering
  const friendUids = new Set(friends?.map(f => f.uid) || [])
  const pendingRequestUids = new Set([
    ...(friendRequests?.map(r => r.requester?.uid).filter(Boolean) || []),
    ...(sentRequests?.map(r => r.recipient?.uid).filter(Boolean) || [])
  ])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setError('')
      return
    }

    setError('')
    try {
      const results = await searchUsers.mutateAsync(searchQuery)
      // Filter out users who are already friends or have pending requests
      const filteredResults = results
        .filter(result => {
          const isFriend = friendUids.has(result.uid || '')
          const hasPendingRequest = pendingRequestUids.has(result.uid || '')
          return !isFriend && !hasPendingRequest
        })
        .map(result => ({
          ...result,
          status: friendUids.has(result.uid || '') ? 'friend' : 
                  pendingRequestUids.has(result.uid || '') ? 'pending' : 'none'
        }))
      setSearchResults(filteredResults)
      
      // Show message if all results were filtered out
      if (results.length > 0 && filteredResults.length === 0) {
        setError('All matching users are already your friends or have pending requests.')
      }
    } catch (error: any) {
      console.error('Search error:', error)
      setError(error.message || 'Failed to search users')
    }
  }

  const handleSendRequest = async (recipientUid: string) => {
    setError('')
    setSuccess('')
    try {
      await sendRequest.mutateAsync(recipientUid)
      // Remove the user from search results
      const user = searchResults.find(r => r.uid === recipientUid)
      setSearchResults(prev => prev.filter(r => r.uid !== recipientUid))
      setSuccess(`Friend request sent to ${user?.displayName || user?.email || 'user'}!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to send friend request')
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptRequest.mutateAsync(requestId)
    } catch (error: any) {
      alert(error.message || 'Failed to accept friend request')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectRequest.mutateAsync(requestId)
    } catch (error: any) {
      alert(error.message || 'Failed to reject friend request')
    }
  }

  const handleRemoveFriend = async (friendUid: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) {
      return
    }

    try {
      await removeFriend.mutateAsync(friendUid)
    } catch (error: any) {
      alert(error.message || 'Failed to remove friend')
    }
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Friends</h1>

        {/* Search for Users */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add Friends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setError('')
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searchUsers.isPending || !searchQuery.trim()}
              >
                {searchUsers.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center gap-2">
                <Check className="h-4 w-4" />
                {success}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.uid}
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      {result.photoURL ? (
                        <img
                          src={result.photoURL}
                          alt={result.displayName || 'User'}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {result.displayName || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.email}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSendRequest(result.uid)}
                      disabled={sendRequest.isPending}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Friend
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searchUsers.isPending && (
              <div className="mt-4 text-sm text-muted-foreground text-center">
                No users found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Friend Requests */}
        {friendRequests && friendRequests.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Friend Requests ({friendRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <div>Loading requests...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {friendRequests.map((request: any) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        {request.requester?.photoURL ? (
                          <img
                            src={request.requester.photoURL}
                            alt={request.requester.displayName || 'User'}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {request.requester?.displayName || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.requester?.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={acceptRequest.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request.id)}
                          disabled={rejectRequest.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sent Friend Requests */}
        {sentRequests && sentRequests.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Sent Friend Requests ({sentRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentRequestsLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <div>Loading sent requests...</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map((request: any) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        {request.recipient?.photoURL ? (
                          <img
                            src={request.recipient.photoURL}
                            alt={request.recipient.displayName || 'User'}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {request.recipient?.displayName || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.recipient?.email}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Pending...
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={rejectRequest.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Messages Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
              {messages && messages.length > 0 && (
                <>
                  <span className="text-muted-foreground font-normal">
                    ({messages.length})
                  </span>
                  {messages.filter(m => !m.read).length > 0 && (
                    <span className="ml-2 text-sm font-normal text-primary">
                      ({messages.filter(m => !m.read).length} unread)
                    </span>
                  )}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messagesLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <div>Loading messages...</div>
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((message) => {
                    const isExpanded = expandedMessageId === message.id
                    return (
                      <div
                        key={message.id}
                        className={`border rounded-md transition-all ${
                          !message.read ? 'bg-primary/5 border-primary/20' : 'bg-card'
                        } ${isExpanded ? 'shadow-md' : ''}`}
                      >
                        <button
                          onClick={() => handleMessageClick(message.id)}
                          className="w-full text-left p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {message.senderPhotoURL ? (
                                <img
                                  src={message.senderPhotoURL}
                                  alt={message.senderName || 'User'}
                                  className="h-10 w-10 rounded-full flex-shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                  <Users className="h-5 w-5 text-primary" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-medium">
                                    {message.senderName || 'Unknown User'}
                                  </div>
                                  {!message.read && (
                                    <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mb-1">
                                  Sent {message.movies.length} movie{message.movies.length !== 1 ? 's' : ''}
                                </div>
                                {message.message && (
                                  <div className="text-sm text-muted-foreground line-clamp-1">
                                    {message.message}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  {message.createdAt.toLocaleDateString()} at {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t pt-4">
                            {message.message && (
                              <div className="mb-4 p-3 bg-muted rounded-md">
                                <p className="text-sm">{message.message}</p>
                              </div>
                            )}
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold mb-3">
                                Movies ({message.movies.length})
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {message.movies.map((movie, index) => (
                                  <div
                                    key={index}
                                    className="group relative rounded-lg overflow-hidden bg-card border hover:shadow-md transition-shadow"
                                  >
                                    <div className="aspect-[2/3] relative overflow-hidden">
                                      {movie.poster ? (
                                        <img
                                          src={getPosterUrl(movie.poster)}
                                          alt={movie.title}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                          {movie.type === 'tv' ? (
                                            <Tv className="h-8 w-8 text-muted-foreground" />
                                          ) : (
                                            <Film className="h-8 w-8 text-muted-foreground" />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-2">
                                      <h5 className="font-semibold text-xs line-clamp-2 mb-1">
                                        {movie.title}
                                      </h5>
                                      {movie.year && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Calendar className="h-3 w-3" />
                                          <span>{movie.year}</span>
                                        </div>
                                      )}
                                      {movie.type === 'tv' && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                          <Tv className="h-3 w-3" />
                                          <span>TV Show</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Link to={`/profile/${message.senderUid}`} className="flex-1">
                                <Button variant="outline" className="w-full" size="sm">
                                  View Profile
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSendMoviesModal({
                                    uid: message.senderUid,
                                    name: message.senderName,
                                  })
                                }}
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Reply
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  No messages yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Friends can send you movie recommendations
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Friends List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Friends ({friends?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {friendsError && (
              <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <div>
                  <div className="font-medium">Error loading friends</div>
                  <div className="text-xs mt-1">{(friendsError as Error)?.message || 'Unknown error'}</div>
                </div>
              </div>
            )}
            {friendsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <div>Loading friends...</div>
              </div>
            ) : friends && friends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map((friend) => (
                  <Card key={friend.uid} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {friend.photoURL ? (
                            <img
                              src={friend.photoURL}
                              alt={friend.displayName || 'Friend'}
                              className="h-12 w-12 rounded-full"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                              <Users className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">
                              {friend.displayName || 'Unknown User'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {friend.email}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFriend(friend.uid)}
                          disabled={removeFriend.isPending}
                          title="Remove friend"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/profile/${friend.uid}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Profile
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSendMoviesModal({
                              uid: friend.uid,
                              name: friend.displayName,
                            })
                          }}
                          title="Send movies"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  You don't have any friends yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Search for users above to add friends
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {sendMoviesModal && (
          <SendMoviesModal
            recipientUid={sendMoviesModal.uid}
            recipientName={sendMoviesModal.name}
            isOpen={!!sendMoviesModal}
            onClose={() => setSendMoviesModal(null)}
          />
        )}
      </div>
    </Layout>
  )
}

