import { useQuery } from '@tanstack/react-query'
import { getPosterUrl, getWatchProviders } from '@/lib/movieApi'
import type { MovieDetails, TVShowDetails } from '@/types'

interface StreamingProvidersProps {
  movieId: number
  type: 'movie' | 'tv'
  details?: MovieDetails | TVShowDetails | null
  maxProviders?: number
  size?: 'sm' | 'md'
}

export default function StreamingProviders({ 
  movieId,
  type,
  details,
  maxProviders = 4,
  size = 'sm' 
}: StreamingProvidersProps) {
  // Use details if available, otherwise fetch providers
  const providersFromDetails = details?.['watch/providers']?.results?.US
  
  const { data: providersData } = useQuery({
    queryKey: ['watch-providers', type, movieId],
    queryFn: () => getWatchProviders(movieId, type),
    enabled: !providersFromDetails, // Only fetch if not in details
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  })

  const providers = providersFromDetails || providersData
  if (!providers) {
    return null
  }

  const flatrate = providers.flatrate || []
  const buy = providers.buy || []
  const rent = providers.rent || []
  
  // Combine all providers, prioritizing flatrate (subscription) over buy/rent
  const allProviders = [
    ...flatrate.map(p => ({ ...p, type: 'flatrate' as const })),
    ...buy.slice(0, 2).map(p => ({ ...p, type: 'buy' as const })),
    ...rent.slice(0, 1).map(p => ({ ...p, type: 'rent' as const })),
  ].slice(0, maxProviders)

  if (allProviders.length === 0) {
    return null
  }

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const containerSize = size === 'sm' ? 'gap-1' : 'gap-1.5'

  return (
    <div className={`flex items-center ${containerSize} flex-wrap`}>
      {allProviders.map((provider) => (
        <div
          key={provider.provider_id}
          className="relative group"
          title={provider.provider_name}
        >
          {provider.logo_path ? (
            <img
              src={getPosterUrl(provider.logo_path, 'w154')}
              alt={provider.provider_name}
              className={`${iconSize} rounded object-contain bg-background/50`}
              onError={(e) => {
                // Fallback to a simple badge if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const fallback = document.createElement('div')
                  fallback.className = `${iconSize} bg-primary/20 rounded flex items-center justify-center text-[8px] font-medium px-0.5`
                  fallback.title = provider.provider_name
                  fallback.textContent = provider.provider_name.charAt(0)
                  parent.appendChild(fallback)
                }
              }}
            />
          ) : (
            <div 
              className={`${iconSize} bg-primary/20 rounded flex items-center justify-center text-[8px] font-medium px-0.5`}
              title={provider.provider_name}
            >
              {provider.provider_name.charAt(0)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
