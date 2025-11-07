import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { useRecentWatches } from '@/hooks/useWatched'
import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Film, Calendar, Star, Tv, Play, MessageCircle } from 'lucide-react'
import LoadingScreen from '@/components/LoadingScreen'
import { useNavigate } from 'react-router-dom'
import { getPosterUrl, getMovieDetails, getTVShowDetails } from '@/lib/movieApi'
import { useAuthStore } from '@/store/authStore'
import { useFriends } from '@/hooks/useFriends'
import SendMoviesModal from '@/components/SendMoviesModal'
import MediaPreviewModal from '@/components/MediaPreviewModal'
import { useAddMovie } from '@/hooks/useMovies'
import type { User, MovieDetails, TVShowDetails } from '@/types'

export default function ProfilePage() {
  const { uid } = useParams<{ uid: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const isOwnProfile = uid === currentUser?.uid
  const [showSendMoviesModal, setShowSendMoviesModal] = useState(false)
  const { data: friends } = useFriends()
  const isFriend = friends?.some(f => f.uid === uid) || false
  const [previewMedia, setPreviewMedia] = useState<{
    id: number
    mediaType: 'movie' | 'tv'
  } | null>(null)
  const [previewDetails, setPreviewDetails] = useState<MovieDetails | TVShowDetails | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const addMovie = useAddMovie()

  const { data: profileUser, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', uid],
    queryFn: async () => {
      if (!uid || !db) throw new Error('Invalid user ID or Firestore not initialized')
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (!userDoc.exists()) throw new Error('User not found')

      const data = userDoc.data()
      return {
        uid,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as User
    },
    enabled: !!uid,
  })

  const { data: recentWatches, isLoading: watchesLoading } = useRecentWatches(uid, 20)

  // Extract TMDB ID from movieId (format: "tmdb:123" or "tmdb:tv:456")
  const extractTmdbId = (movieId: string): { id: number; type: 'movie' | 'tv' } | null => {
    if (!movieId) return null
    
    // Handle format: "tmdb:123" (movie) or "tmdb:tv:456" (TV show)
    const parts = movieId.split(':')
    if (parts.length === 2 && parts[0] === 'tmdb') {
      // Movie format: "tmdb:123"
      const id = parseInt(parts[1], 10)
      if (!isNaN(id)) return { id, type: 'movie' }
    } else if (parts.length === 3 && parts[0] === 'tmdb' && parts[1] === 'tv') {
      // TV format: "tmdb:tv:456"
      const id = parseInt(parts[2], 10)
      if (!isNaN(id)) return { id, type: 'tv' }
    }
    
    return null
  }

  const handlePreviewWatched = async (watch: { movieId: string; type: 'movie' | 'tv' }) => {
    const tmdbData = extractTmdbId(watch.movieId)
    if (!tmdbData) {
      console.error('Invalid movieId format:', watch.movieId)
      return
    }

    setPreviewMedia({ id: tmdbData.id, mediaType: tmdbData.type })
    setIsLoadingPreview(true)
    setPreviewDetails(null)

    try {
      const details = tmdbData.type === 'tv'
        ? await getTVShowDetails(tmdbData.id)
        : await getMovieDetails(tmdbData.id)
      setPreviewDetails(details)
    } catch (error: any) {
      console.error('Error loading preview:', error)
      setIsLoadingPreview(false)
      setPreviewMedia(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleAddFromPreview = (collectionId: string) => {
    if (!previewMedia || !previewDetails) return

    const { mediaType } = previewMedia

    try {
      if (mediaType === 'movie') {
        const details = previewDetails as MovieDetails
        const year = details.release_date
          ? new Date(details.release_date).getFullYear()
          : undefined

        addMovie.mutate(
          {
            collectionId,
            movieData: {
              movieId: `tmdb:${details.id}`,
              title: details.title,
              year: year || 0,
              type: 'movie',
              poster: details.poster_path || undefined,
              runtime: details.runtime,
              genres: details.genres?.map((g) => g.name) || [],
              critics: {
                imdb: details.vote_average ? details.vote_average * 10 : undefined,
              },
              trailer: details.videos?.results?.find(
                (v) => v.type === 'Trailer' && v.site === 'YouTube'
              )
                ? {
                    provider: 'youtube',
                    key: details.videos.results.find(
                      (v) => v.type === 'Trailer' && v.site === 'YouTube'
                    )!.key,
                  }
                : undefined,
              formats: ['DVD'],
              quantity: 1,
              addedBy: '',
              updatedBy: '',
            },
          },
          {
            onSuccess: () => {
              setPreviewMedia(null)
              setPreviewDetails(null)
            },
            onError: (error: any) => {
              console.error('Failed to add movie:', error)
            },
          }
        )
      } else {
        // TV Show
        const details = previewDetails as TVShowDetails
        const year = details.first_air_date
          ? new Date(details.first_air_date).getFullYear()
          : undefined

        addMovie.mutate(
          {
            collectionId,
            movieData: {
              movieId: `tmdb:tv:${details.id}`,
              title: details.name,
              year: year || 0,
              type: 'tv',
              poster: details.poster_path || undefined,
              runtime: details.episode_run_time?.[0] || undefined,
              genres: details.genres?.map((g) => g.name) || [],
              critics: {
                imdb: details.vote_average ? details.vote_average * 10 : undefined,
              },
              trailer: details.videos?.results?.find(
                (v) => v.type === 'Trailer' && v.site === 'YouTube'
              )
                ? {
                    provider: 'youtube',
                    key: details.videos.results.find(
                      (v) => v.type === 'Trailer' && v.site === 'YouTube'
                    )!.key,
                  }
                : undefined,
              formats: ['DVD'],
              quantity: 1,
              addedBy: '',
              updatedBy: '',
              numberOfSeasons: details.number_of_seasons,
              numberOfEpisodes: details.number_of_episodes,
              firstAirDate: details.first_air_date,
            },
          },
          {
            onSuccess: () => {
              setPreviewMedia(null)
              setPreviewDetails(null)
            },
            onError: (error: any) => {
              console.error('Failed to add TV show:', error)
            },
          }
        )
      }
    } catch (error: any) {
      console.error('Error adding media:', error)
    }
  }

  if (profileLoading) {
    return (
      <Layout>
        <LoadingScreen message="Loading profile..." fullScreen={false} />
      </Layout>
    )
  }

  if (!profileUser) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">User not found</h1>
            <Button onClick={() => navigate('/friends')}>Back to Friends</Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/friends')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Friends
        </Button>

        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              {profileUser.photoURL ? (
                <img
                  src={profileUser.photoURL}
                  alt={profileUser.displayName || 'User'}
                  className="h-24 w-24 rounded-full"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                  <Film className="h-12 w-12 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">
                  {profileUser.displayName || 'Unknown User'}
                </h1>
                <p className="text-muted-foreground mb-2">{profileUser.email}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Member since {new Date(profileUser.createdAt).toLocaleDateString()}
                </p>
                {!isOwnProfile && isFriend && (
                  <Button
                    onClick={() => setShowSendMoviesModal(true)}
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Send Movies
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {showSendMoviesModal && (
          <SendMoviesModal
            recipientUid={uid || ''}
            recipientName={profileUser.displayName}
            isOpen={showSendMoviesModal}
            onClose={() => setShowSendMoviesModal(false)}
          />
        )}

        {/* Recent Watches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Recent Watches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {watchesLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-muted rounded-lg animate-shimmer" />
                ))}
              </div>
            ) : recentWatches && recentWatches.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {recentWatches.map((watch, index) => (
                  <div
                    key={watch.id}
                    onClick={() => handlePreviewWatched(watch)}
                    className="group relative rounded-lg overflow-hidden bg-card border hover:shadow-xl transition-smooth hover:scale-[1.02] animate-fade-in-up cursor-pointer"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="aspect-[2/3] relative overflow-hidden">
                      {watch.poster ? (
                        <img
                          src={getPosterUrl(watch.poster)}
                          alt={watch.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          {watch.type === 'tv' ? (
                            <Tv className="h-12 w-12 text-muted-foreground" />
                          ) : (
                            <Film className="h-12 w-12 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      {watch.streamingService && (
                        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                          {watch.streamingService}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                        {watch.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {watch.year && (
                          <>
                            <Calendar className="h-3 w-3" />
                            <span>{watch.year}</span>
                          </>
                        )}
                        {watch.type === 'tv' && (
                          <span className="ml-auto flex items-center gap-1">
                            <Tv className="h-3 w-3" />
                            TV
                          </span>
                        )}
                      </div>
                      {watch.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{watch.rating}/5</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(watch.watchedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Film className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {isOwnProfile
                    ? "You haven't watched anything yet"
                    : 'No recent watches'}
                </p>
                {isOwnProfile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Mark movies as watched from the movie detail page
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <MediaPreviewModal
          isOpen={!!previewMedia}
          onClose={() => {
            setPreviewMedia(null)
            setPreviewDetails(null)
          }}
          onAdd={handleAddFromPreview}
          mediaType={previewMedia?.mediaType || 'movie'}
          details={previewDetails}
          isLoading={isLoadingPreview}
          isAdding={addMovie.isPending}
        />
      </div>
    </Layout>
  )
}

