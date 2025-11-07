import { Film } from 'lucide-react'

interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export default function LoadingScreen({ message = 'Loading...', fullScreen = true }: LoadingScreenProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen ? 'min-h-screen' : 'min-h-[400px]'
      } bg-background`}
    >
      <div className="relative">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 animate-spin-slow">
          <div className="w-20 h-20 border-4 border-primary/20 rounded-full border-t-primary"></div>
        </div>
        
        {/* Inner pulsing circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-primary/20 rounded-full animate-pulse"></div>
        </div>
        
        {/* Center icon */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          <Film className="h-10 w-10 text-primary animate-bounce-subtle" />
        </div>
      </div>
      
      {message && (
        <p className="mt-6 text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  )
}

