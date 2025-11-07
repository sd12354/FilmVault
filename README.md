# FilmVault
# FilmVault

**A modern web app for cataloging and managing your physical DVD collection with collaborative features.**

## 🎬 Overview

FilmVault helps movie collectors digitize and organize their physical DVD libraries. Scan barcodes, search titles, and build a comprehensive digital catalog of your collection with rich movie metadata, ratings, and trailers. Share collections with friends and family for collaborative management.

## ✨ Key Features

- 📱 **Barcode Scanning** - Quick DVD entry via mobile camera
- 🔍 **Smart Search** - Find movies instantly using TMDB API
- 🎯 **Rich Metadata** - Automatic import of descriptions, trailers, cast, and critic ratings
- ⭐ **Personal Ratings** - Rate and review your collection
- 👥 **Collaborative Collections** - Invite others to view or co-manage collections
- 🎨 **Modern UI** - Clean, minimalistic design with responsive mobile support
- 🔐 **Secure Auth** - Google OAuth and email/password login via Firebase

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI Framework:** Tailwind CSS + shadcn/ui components
- **State Management:** Zustand + React Query
- **Backend:** Firebase (Firestore, Auth, Storage, Hosting)
- **APIs:** TMDB (The Movie Database) for movie metadata
- **Barcode Scanning:** ZXing library
- **PWA:** Vite PWA plugin with Workbox
- **Authentication:** Firebase Auth (Google OAuth, Email/Password)
- **Deployment:** Firebase Hosting

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account
- TMDB API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/filmvault.git

# Navigate to project directory
cd filmvault

# Install dependencies
npm install

# Create .env file with your credentials
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_TMDB_API_KEY=your_tmdb_api_key
```

**Note:** Vite uses `VITE_` prefix for environment variables (not `REACT_APP_`).

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## 📖 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup and deployment instructions
- [Product Requirements Document](./PRD.md) - Full PRD (see user query for details)

## 🧪 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📱 Features

### Collection Management
- Create multiple collections (personal, family, genre-specific)
- Add movies via barcode scan or manual search
- View detailed movie information with trailers
- Sort and filter by genre, rating, year, and more

### Rating & Organization
- Personal 5-star rating system
- Add custom notes and reviews
- Mark movies as watched/unwatched
- Favorite/bookmark functionality

### Collaboration
- Invite users to collections via email
- Role-based permissions (Owner, Editor, Viewer)
- Real-time updates across all members
- Activity feed for shared collections

## 🗺️ Roadmap (v2+)

- [x] Core MVP features
- [ ] Export to CSV/JSON (UI ready, backend pending)
- [ ] Invite system (UI ready, backend pending)
- [ ] Activity log
- [ ] Advanced filtering and sorting
- [ ] Drag-and-drop ranking
- [ ] Public share links
- [ ] Bulk import
- [ ] Lending tracker
- [ ] Mobile app (React Native/Capacitor)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 👏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for movie database API
- [Firebase](https://firebase.google.com/) for backend infrastructure
- All contributors who help improve FilmVault

## 📧 Contact

Project Link: [https://github.com/yourusername/filmvault](https://github.com/yourusername/filmvault)

---

**⭐ Star this repo if you find it helpful!**
