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

- **Frontend:** React, Context API
- **Backend:** Firebase (Firestore, Auth, Hosting)
- **APIs:** TMDB (The Movie Database)
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
npm start
```

### Environment Variables

Create a `.env` file in the root directory:

```
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_TMDB_API_KEY=your_tmdb_api_key
```

## 📖 Documentation

- [Requirements Document](./docs/REQUIREMENTS.md)
- [API Documentation](./docs/API.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Run test coverage
npm run test:coverage
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

## 🗺️ Roadmap

- [ ] Core MVP features
- [ ] Mobile app (React Native)
- [ ] Wishlist feature
- [ ] Lending tracker
- [ ] Export to CSV/PDF
- [ ] Import from file
- [ ] Public profile pages
- [ ] Streaming availability integration

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
