import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from '@/components/ThemeProvider'
import { Film, Scan, Share2, Star, ChevronRight, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import Footer from '@/components/Footer'

export default function LandingPage() {
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen">
      {/* Theme Toggle */}
      <div className="container mx-auto px-4 py-4 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <Film className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-6">FilmVault</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Catalog and share your physical DVD collection with rich metadata, ratings, and trailers.
          </p>
          {user ? (
            <Link to="/library">
              <Button size="lg" className="text-lg px-8">
                Go to Library
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="text-lg px-8">
                  Get Started
                </Button>
              </Link>
              <Link to="/signin">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                </div>
                <CardTitle className="text-center">Sign In</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Sign in with Google or email to get started. Your library syncs across all your devices.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Scan className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center">Scan or Search</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Add movies in seconds by scanning a barcode on your phone or searching by title.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Share2 className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center">Rank & Share</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Rate and rank your collection, then share it with friends and family.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">What People Are Saying</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                "I cataloged 200 DVDs in an afternoon."
              </p>
              <p className="font-semibold">— Jordan M.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                "Finally a place for my physical library."
              </p>
              <p className="font-semibold">— Priya R.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-4">
                "The rankings view is addicting."
              </p>
              <p className="font-semibold">— Casey T.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Which platforms are supported?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  FilmVault works on iOS Safari, Android Chrome, and desktop browsers (Chrome, Edge, Firefox, Safari).
                  It's a Progressive Web App, so you can install it on your phone for a native-like experience.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Can I share my collection?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Yes! You can invite others by email to view or co-manage your collection. You control who has access
                  and what permissions they have (viewer, contributor, or owner).
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Where do ratings come from?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  We pull critic ratings from Rotten Tomatoes, Metacritic, and IMDb. You can also add your own personal
                  rating and notes for each movie.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Do you support Blu-ray/4K?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Yes! You can specify the format (DVD, Blu-ray, or 4K) for each title in your collection.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>How do invites work?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Collection owners can invite others by email. Invitees receive a secure link that expires after a set
                  time. Once accepted, they can view or edit based on the role you assigned.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>How do I export my data?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  You can export your collection data as CSV or JSON from the Settings page. This includes all movie
                  details, ratings, and personal notes.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}

