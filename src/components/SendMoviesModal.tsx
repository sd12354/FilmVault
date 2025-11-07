import { useState } from 'react'
import { useCollections } from '@/hooks/useCollections'
import { useMovies } from '@/hooks/useMovies'
import { useSendMovies } from '@/hooks/useMessages'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { X, Film, Tv, Check, Loader2 } from 'lucide-react'
import { getPosterUrl } from '@/lib/movieApi'
import type { MovieItem } from '@/types'

interface SendMoviesModalProps {
  recipientUid: string
  recipientName?: string
  isOpen: boolean
  onClose: () => void
}

export default function SendMoviesModal({
  recipientUid,
  recipientName,
  isOpen,
  onClose,
}: SendMoviesModalProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [selectedMovies, setSelectedMovies] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const { data: collections } = useCollections()
  const { data: movies } = useMovies(selectedCollectionId || '')
  const sendMovies = useSendMovies()

  if (!isOpen) return null

  const handleToggleMovie = (movieId: string) => {
    const newSelected = new Set(selectedMovies)
    if (newSelected.has(movieId)) {
      newSelected.delete(movieId)
    } else {
      newSelected.add(movieId)
    }
    setSelectedMovies(newSelected)
  }

  const handleSend = async () => {
    if (selectedMovies.size === 0) {
      alert('Please select at least one movie to send')
      return
    }

    const moviesToSend = movies
      ?.filter((m) => selectedMovies.has(m.id))
      .map((m) => ({
        movieId: m.movieId,
        title: m.title,
        year: m.year,
        poster: m.poster,
        type: m.type,
      })) || []

    try {
      await sendMovies.mutateAsync({
        recipientUid,
        movies: moviesToSend,
        message: message.trim() || undefined,
      })
      // Reset state
      setSelectedMovies(new Set())
      setMessage('')
      setSelectedCollectionId(null)
      onClose()
    } catch (error: any) {
      alert(error.message || 'Failed to send movies')
    }
  }

  const selectedMoviesList = movies?.filter((m) => selectedMovies.has(m.id)) || []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>
              Send Movies to {recipientName || 'Friend'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Collection Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Collection</label>
            <div className="flex gap-2 flex-wrap">
              {collections?.map((collection) => (
                <Button
                  key={collection.id}
                  variant={selectedCollectionId === collection.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedCollectionId(collection.id)
                    setSelectedMovies(new Set())
                  }}
                >
                  {collection.name} ({collection.itemCount})
                </Button>
              ))}
            </div>
          </div>

          {/* Movies Grid */}
          {selectedCollectionId && movies && (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {movies.map((movie) => {
                  const isSelected = selectedMovies.has(movie.id)
                  return (
                    <div
                      key={movie.id}
                      className={`relative rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary shadow-lg scale-105'
                          : 'border-transparent hover:border-muted-foreground/50'
                      }`}
                      onClick={() => handleToggleMovie(movie.id)}
                    >
                      <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                        {movie.poster ? (
                          <img
                            src={getPosterUrl(movie.poster)}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            {movie.type === 'tv' ? (
                              <Tv className="h-12 w-12 text-muted-foreground" />
                            ) : (
                              <Film className="h-12 w-12 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-2">
                              <Check className="h-6 w-6" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h3 className="font-semibold text-sm line-clamp-2">
                          {movie.title}
                        </h3>
                        {movie.year && (
                          <p className="text-xs text-muted-foreground">{movie.year}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selected Movies Summary */}
          {selectedMoviesList.length > 0 && (
            <div className="border-t pt-4 flex-shrink-0">
              <p className="text-sm font-medium mb-2">
                Selected: {selectedMoviesList.length} movie{selectedMoviesList.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2 flex-wrap mb-4">
                {selectedMoviesList.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-sm"
                  >
                    <span>{movie.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleMovie(movie.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="flex-shrink-0">
            <label className="text-sm font-medium mb-2 block">Optional Message</label>
            <Input
              placeholder="Add a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end flex-shrink-0">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={selectedMovies.size === 0 || sendMovies.isPending}
            >
              {sendMovies.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send {selectedMovies.size} Movie{selectedMovies.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

