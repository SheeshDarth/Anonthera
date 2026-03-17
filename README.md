# AnonThera - Anonymous Student Support Platform

AnonThera is a secure, anonymous mental health support platform designed specifically for students aged 15-21 in India. Built by students, for students, it provides AI-powered chat, mood tracking, peer matching, and verified helpline resources.

## 🌟 Features

- **AI Chat Companion**: Anonymous, supportive conversations with Google Gemini AI
- **Mood Tracking**: Daily check-ins with energy levels, worries, and gratitude logging
- **Peer Matching**: Safe, anonymous peer-to-peer support with struggle-based matching
- **Multi-language Support**: English, Hindi, Tamil, Telugu, and Kannada
- **Verified Helplines**: Quick access to professional mental health resources
- **Data Export**: Download your mood tracking data for personal records
- **Enhanced Safety**: Content filtering, chat timeouts, and reporting mechanisms

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore and Authentication enabled
- Google AI (Gemini) API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/anonthera.git
   cd anonthera
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and Firebase config
   ```

4. **Configure Firebase**
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Firestore Database
   - Enable Authentication with Google sign-in
   - Copy your Firebase configuration to `.env`

5. **Get Google AI API Key**
   - Visit https://makersuite.google.com/app/apikey
   - Create a new API key
   - Add it to your `.env` file as `VITE_GEMINI_KEY`

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:5173`

## 🔧 Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Google AI Configuration
VITE_GEMINI_KEY=your_gemini_api_key_here
```

## 🏗️ Project Structure

```
anonthera/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── Chat.jsx       # AI chat interface
│   │   ├── Mood.jsx       # Mood tracking
│   │   ├── Peer.jsx       # Peer matching
│   │   ├── Help.jsx       # Helpline resources
│   │   ├── Onboarding.jsx # User onboarding
│   │   ├── ErrorBoundary.jsx # Error handling
│   │   └── LoadingSpinner.jsx # Loading states
│   ├── App.jsx            # Main application component
│   ├── firebase.js        # Firebase configuration
│   ├── constants.js       # App constants
│   └── main.jsx           # Application entry point
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## 🏗️ Architecture & Scalability

AnonThera is designed with production-readiness and high availability in mind:

- **Component-Driven UI**: The React interface is heavily modularized. Features like `VoiceVisualizer`, `MessageBubble`, and `Toast` are separated and wrapped in `React.memo` to eliminate cascading re-renders.
- **Fluid Micro-Interactions**: We utilize Framer Motion for GPU-accelerated enter/exit animations that run smoothly without blocking the main browser thread.
- **Serverless Backend**: Firebase Authentication and Firestore scale automatically. Real-time chat subscriptions utilize strict `unsubscribes` to prevent memory leaks.
- **Robust API Resilience**: The AI hook (`useAI`) handles rate-limits, connection drops, and empty responses gracefully by seamlessly falling back to pre-translated, localized lifelines.
- **Voice Native**: Built-in Web Audio API integration processes microphone streams via a local `AudioContext` and dynamically draws visualizers without straining the React render cycle.

## 🛡️ Safety Features

- **Content Filtering**: Automatic detection and blocking of inappropriate content
- **Chat Timeouts**: Sessions automatically end after 30 minutes for safety
- **Reporting System**: Users can report inappropriate peer conversations
- **Anonymous Matching**: Personal information is never shared between peers
- **Crisis Protocol**: AI assistant guides users to professional help when needed

## 🌍 Multi-language Support

AnonThera supports Indian regional languages:
- English (en)
- Hindi (hi) 
- Tamil (ta)
- Telugu (te)
- Kannada (kn)

## 📊 Data Privacy

- All user data is anonymized using generated IDs
- Local storage for anonymous users
- Optional Google account linking for data persistence
- Data export functionality for user control
- GDPR-like data handling principles

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🧪 Testing

The project includes basic testing setup. Run tests with:
```bash
npm test
```

## 📱 Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔒 Security Considerations

- Environment variables for sensitive data
- Firebase security rules implementation needed
- Content sanitization and validation
- Rate limiting considerations for production
- HTTPS required for production deployment

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you or someone you know is in immediate danger, please contact local emergency services or use the verified helplines provided in the app.

## 🙏 Acknowledgments

- Google AI for the Gemini API
- Firebase for backend services
- The student community for feedback and testing
- Mental health professionals for guidance

---

**Built with ❤️ by students, for students**
