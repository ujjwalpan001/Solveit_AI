# AI Tutor MVP - Complete Learning Platform

A full-stack AI-powered tutoring application that generates step-by-step explanations with optional animated video tutorials for any subject.

## 🚀 Features

### Core Functionality
- **Multi-subject Support**: Math, Science, History, Programming, General topics
- **Intelligent Explanations**: LLM-powered structured step-by-step solutions
- **Video Generation**: Manim-powered animations for math/science, slide-style for others
- **Text-to-Speech**: Multi-language voice narration (English/Hindi)
- **Personal Dashboard**: Complete Q&A history with search and filtering

### User Experience
- **Secure Authentication**: JWT-based user management
- **Rich Content Rendering**: KaTeX math, Markdown, syntax highlighting
- **Video Player**: Custom controls with download functionality
- **Mobile Responsive**: Optimized for all devices
- **Real-time Status**: Live updates on video processing

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt
- **LLM Integration**: Nebius AI (Qwen model)
- **Job Processing**: Simple in-memory queue with retry logic

### Frontend
- **Framework**: React 18 with hooks
- **Styling**: Tailwind CSS
- **State Management**: Context API + useReducer
- **Routing**: React Router v6
- **Math Rendering**: KaTeX via react-katex
- **Markdown**: react-markdown with syntax highlighting
- **Icons**: Lucide React

### Video Generation
- **Math/Science**: ManimCE (Python)
- **General Content**: Slide-style animations
- **TTS**: Google Text-to-Speech (gTTS)
- **Fallback**: OpenCV-based simple video generation

## 📁 Project Structure

# AI Tutor MVP - Complete Learning Platform

A full-stack AI-powered tutoring application that generates step-by-step explanations with optional animated video tutorials for any subject.

## 🚀 Features

### Core Functionality
- **Multi-subject Support**: Math, Science, History, Programming, General topics
- **Intelligent Explanations**: LLM-powered structured step-by-step solutions
- **Video Generation**: Manim-powered animations for math/science, slide-style for others
- **Text-to-Speech**: Multi-language voice narration (English/Hindi)
- **Personal Dashboard**: Complete Q&A history with search and filtering

### User Experience
- **Secure Authentication**: JWT-based user management
- **Rich Content Rendering**: KaTeX math, Markdown, syntax highlighting
- **Video Player**: Custom controls with download functionality
- **Mobile Responsive**: Optimized for all devices
- **Real-time Status**: Live updates on video processing

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt
- **LLM Integration**: Nebius AI (Qwen model)
- **Job Processing**: Simple in-memory queue with retry logic

### Frontend
- **Framework**: React 18 with hooks
- **Styling**: Tailwind CSS
- **State Management**: Context API + useReducer
- **Routing**: React Router v6
- **Math Rendering**: KaTeX via react-katex
- **Markdown**: react-markdown with syntax highlighting
- **Icons**: Lucide React

### Video Generation
- **Math/Science**: ManimCE (Python)
- **General Content**: Slide-style animations
- **TTS**: Google Text-to-Speech (gTTS)
- **Fallback**: OpenCV-based simple video generation

## 📁 Project Structure

ai-tutor-mvp/
├── backend/ # Node.js API server
│ ├── src/
│ │ ├── controllers/ # Route handlers
│ │ ├── models/ # MongoDB schemas
│ │ ├── services/ # Business logic
│ │ ├── middlewares/ # Auth & error handling
│ │ ├── routes/ # API endpoints
│ │ └── jobs/ # Background processing
│ └── package.json
├── worker/ # Python video generation
│ ├── manim_worker.py # FastAPI worker service
│ ├── tts_worker.py # Text-to-speech utility
│ └── requirements.txt
├── frontend/ # React application
│ ├── src/
│ │ ├── components/ # UI components
│ │ ├── context/ # State management
│ │ ├── hooks/ # Custom hooks
│ │ └── utils/ # API & auth utilities
│ └── package.json
└── uploads/videos/ # Generated content storage

text

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB (local or Atlas)
- FFmpeg (for video processing)

### Installation

1. **Clone Repository**
git clone <repository-url>
cd ai-tutor-mvp

text

2. **Setup Backend**
cd backend
npm install
cp .env.example .env

Configure your environment variables
npm run dev

text

3. **Setup Python Worker**
cd worker
pip install -r requirements.txt
python manim_worker.py

text

4. **Setup Frontend**
cd frontend
npm install
npm start

text

### Environment Configuration

Create `backend/.env`:
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
NEBIUS_API_KEY=your_nebius_api_key
WORKER_URL=http://localhost:8000
NODE_ENV=development

text

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Questions
- `POST /api/questions` - Ask new question
- `GET /api/questions` - Get user questions (paginated)
- `GET /api/questions/:id` - Get specific question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/questions/:id/generate-video` - Generate video

### User Dashboard
- `GET /api/users/dashboard/stats` - Dashboard statistics
- `GET /api/users/search` - Search questions

## 🎯 Usage Examples

### Ask a Math Question
const response = await fetch('/api/questions', {
method: 'POST',
headers: {
'Authorization': 'Bearer ' + token,
'Content-Type': 'application/json'
},
body: JSON.stringify({
question: "Solve: 2x + 5 = 13",
subject: "math",
generateVideo: true
})
});

text

### Search History
const results = await fetch('/api/users/search?query=algebra&subject=math');

text

## 🔧 Development

### Backend Development
cd backend
npm run dev # Start with nodemon
npm test # Run tests
npm run lint # Code linting

text

### Frontend Development
cd frontend
npm start # Development server
npm run build # Production build
npm test # Run tests

text

### Worker Development
cd worker
python manim_worker.py # Start FastAPI worker

Worker runs on http://localhost:8000
text

## 🚀 Deployment

### Backend (Node.js)
1. Build application: `npm run build`
2. Set production environment variables
3. Deploy to your preferred platform (Vercel, Railway, etc.)

### Worker (Python)
1. Install dependencies: `pip install -r requirements.txt`
2. Deploy FastAPI service (Railway, Render, etc.)
3. Update `WORKER_URL` in backend environment

### Frontend (React)
1. Build application: `npm run build`
2. Deploy static files (Netlify, Vercel, etc.)
3. Update API endpoints for production

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error messages
- **CORS Protection**: Configurable cross-origin requests

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Dark/Light Mode**: User preference support
- **Accessibility**: WCAG compliant components
- **Loading States**: Smooth user feedback
- **Error Boundaries**: Graceful error handling

## 📊 Performance

- **Lazy Loading**: Component-based code splitting
- **Caching**: Intelligent API response caching
- **Optimization**: Minified assets and tree shaking
- **CDN Ready**: Static asset optimization

## 🧪 Testing

### Backend Testing
cd backend
npm test # Run all tests
npm run test:watch # Watch mode
npm run test:coverage # Coverage report

text

### Frontend Testing
cd frontend
npm test # React Testing Library
npm run test:e2e # End-to-end tests

text

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push branch: `git push origin feature-name`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)
- **Email**: support@ai-tutor.com

---

**Built with ❤️ for learners everywhere**