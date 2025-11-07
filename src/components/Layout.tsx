import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from './ui/button'
import { Film, LogOut, Settings, Search, Scan, Users } from 'lucide-react'
import Footer from './Footer'
import { useFriendRequests } from '@/hooks/useFriends'
import { useMessages } from '@/hooks/useMessages'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { data: friendRequests } = useFriendRequests()
  const { data: messages } = useMessages()
  const pendingRequestsCount = friendRequests?.length || 0
  const unreadMessagesCount = messages?.filter(m => !m.read).length || 0
  const totalNotifications = pendingRequestsCount + unreadMessagesCount

  const handleSignOut = async () => {
    if (!auth) {
      console.warn('Firebase auth not initialized')
      navigate('/')
      return
    }

    try {
      await signOut(auth)
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/library" className="flex items-center gap-2 text-xl font-bold">
            <Film className="h-6 w-6" />
            <span className="hidden md:inline">FilmVault</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/search">
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/scan">
              <Button variant="ghost" size="icon">
                <Scan className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/friends" className="relative">
              <Button variant="ghost" size="icon">
                <Users className="h-5 w-5" />
              </Button>
              {totalNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 min-w-[1.25rem] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-md border-2 border-background">
                  {totalNotifications > 9 ? '9+' : totalNotifications}
                </span>
              )}
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            {user && (
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

