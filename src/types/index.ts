export interface User {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  createdAt: Date
  defaultCollectionId?: string
}

export interface Collection {
  id: string
  ownerUid: string
  name: string
  createdAt: Date
  archived: boolean
  visibility: 'private'
  memberCount: number
  itemCount: number
}

export type MemberRole = 'owner' | 'contributor' | 'viewer'

export interface CollectionMember {
  uid: string
  role: MemberRole
  invitedBy: string
  invitedAt: Date
  acceptedAt: Date | null
}

export type MediaType = 'movie' | 'tv'

export interface MovieItem {
  id: string
  movieId: string // Provider + ID (e.g., "tmdb:12345" or "tmdb:tv:12345")
  title: string
  year: number
  type: MediaType // 'movie' or 'tv'
  poster?: string
  runtime?: number // For movies: runtime in minutes, For TV: average episode runtime
  genres: string[]
  critics: {
    imdb?: number
    metacritic?: number
    rottenTomatoes?: number
  }
  trailer?: {
    provider: 'youtube'
    key: string
  }
  formats: ('DVD' | 'Blu-ray' | '4K')[]
  condition?: string
  location?: string
  quantity: number
  addedBy: string
  addedAt: Date
  updatedBy: string
  updatedAt: Date
  // TV show specific fields
  numberOfSeasons?: number
  numberOfEpisodes?: number
  firstAirDate?: string
}

export interface UserMeta {
  uid: string
  rating?: number // 0.5-5
  rank?: number
  tags: string[]
  notes?: string
}

export interface Invite {
  id: string
  collectionId: string
  email: string
  role: MemberRole
  createdBy: string
  createdAt: Date
  expiresAt: Date
  status: 'pending' | 'accepted' | 'declined' | 'expired'
}

export interface Activity {
  id: string
  collectionId: string
  actorUid: string
  type: 'added' | 'edited' | 'removed' | 'invited' | 'joined'
  itemRef?: string
  createdAt: Date
  metadata?: Record<string, unknown>
}

export interface MovieSearchResult {
  id: number
  title: string
  release_date?: string
  first_air_date?: string // For TV shows
  poster_path?: string
  overview?: string
  vote_average?: number
  media_type?: 'movie' | 'tv' // From multi-search
}

export interface TVShowDetails {
  id: number
  name: string
  first_air_date?: string
  poster_path?: string
  backdrop_path?: string
  overview?: string
  episode_run_time?: number[]
  genres: Array<{ id: number; name: string }>
  vote_average?: number
  vote_count?: number
  number_of_seasons?: number
  number_of_episodes?: number
  videos?: {
    results: Array<{
      key: string
      type: string
      site: string
    }>
  }
  credits?: {
    cast: Array<{
      name: string
      character: string
    }>
    crew: Array<{
      name: string
      job: string
    }>
  }
  'watch/providers'?: {
    results?: {
      US?: {
        flatrate?: Array<{
          provider_id: number
          provider_name: string
          logo_path?: string
        }>
        buy?: Array<{
          provider_id: number
          provider_name: string
          logo_path?: string
        }>
        rent?: Array<{
          provider_id: number
          provider_name: string
          logo_path?: string
        }>
      }
    }
    }
}

export interface MovieDetails {
  id: number
  title: string
  release_date?: string
  poster_path?: string
  backdrop_path?: string
  overview?: string
  runtime?: number
  genres: Array<{ id: number; name: string }>
  vote_average?: number
  vote_count?: number
  videos?: {
    results: Array<{
      key: string
      type: string
      site: string
    }>
  }
  credits?: {
    cast: Array<{
      name: string
      character: string
    }>
    crew: Array<{
      name: string
      job: string
    }>
  }
  'watch/providers'?: {
    results?: {
      US?: {
        flatrate?: Array<{
          provider_id: number
          provider_name: string
          logo_path?: string
        }>
        buy?: Array<{
          provider_id: number
          provider_name: string
          logo_path?: string
        }>
        rent?: Array<{
          provider_id: number
          provider_name: string
          logo_path?: string
        }>
      }
    }
  }
}

export interface Friend {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  createdAt: Date
  friendSince: Date
}

export interface WatchedItem {
  id: string
  userId: string
  movieId: string // Provider + ID (e.g., "tmdb:12345")
  title: string
  year?: number
  poster?: string
  type: 'movie' | 'tv' // movie or TV show
  streamingService?: string // e.g., "Netflix", "Disney+", "Physical", etc.
  watchedAt: Date
  rating?: number // 0.5-5
  notes?: string
}

