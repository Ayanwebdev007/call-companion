# Call Companion - Production Ready

A modern CRM application for managing customer calls and scheduling.

## 🚀 Production Deployment

### Prerequisites
- Node.js 18.x or higher
- npm 8.x or higher

### Build for Production
```bash
npm run build
```

This will generate optimized production files in the `frontend/dist/` directory.

### Deploy to Production
```bash
npm run deploy
```

### Preview Production Build
```bash
npm run preview
```

## 📁 Project Structure
```
├── frontend/             # Frontend application
│   ├── dist/             # Production build output
│   ├── src/              # Source code
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # React context providers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions and API clients
│   │   ├── pages/        # Page components
│   │   └── App.tsx       # Main application component
│   ├── public/           # Static assets
│   ├── index.html        # Entry HTML file
│   ├── package.json      # Frontend dependencies and scripts
│   └── vite.config.ts    # Build configuration
├── backend/              # Backend API server
│   ├── index.js          # Entry point
│   ├── routes/           # API routes
│   ├── models/           # Database models
│   ├── middleware/       # Authentication middleware
│   ├── package.json      # Backend dependencies
│   └── .env              # Backend environment variables
├── package.json          # Root package with unified scripts
└── render.yaml           # Render deployment blueprint
```

## 🛠️ Available Scripts

### Development
```bash
npm run dev              # Start both frontend and backend servers
npm run dev:frontend     # Start frontend development server
npm run dev:backend      # Start backend development server
```

### Production
```bash
npm run build            # Build frontend for production
npm run start            # Start backend server
npm run preview          # Preview production build
npm run deploy           # Prepare for deployment
npm run deploy:render    # Deploy to Render using render.yaml
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:
```env
VITE_API_URL=/api
```

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
DATABASE_URL=mongodb://localhost:27017/callcompanion
JWT_SECRET=your_jwt_secret_here
```

## ☁️ Deployment Options

### Render Deployment (Recommended)
1. Fork this repository to your GitHub account
2. Sign up at [Render](https://render.com)
3. Click "New +" and select "Blueprint"
4. Connect your GitHub repository
5. Select the `render.yaml` file
6. Render will automatically deploy both services

Alternatively, deploy services individually:
1. Go to Render Dashboard
2. Create a "Static Site" for frontend:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`
3. Create a "Web Service" for backend:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
4. Add environment variables to backend service:
   - DATABASE_URL (your MongoDB connection string)
   - JWT_SECRET (random string for JWT signing)

### Docker Deployment
```bash
# Build and run frontend
docker build -t call-companion-frontend .
docker run -p 80:80 call-companion-frontend

# Build and run backend
cd backend
docker build -t call-companion-backend .
docker run -p 5000:5000 call-companion-backend
```

### Manual Deployment
1. Build frontend: `npm run build`
2. Deploy frontend files from `frontend/dist/` to static hosting
3. Deploy backend to a Node.js hosting service
4. Configure API URL in environment variables

## 🔒 Security Considerations

- All API calls use secure authentication
- Environment variables are properly separated
- No sensitive information is exposed client-side
- Dependencies are regularly updated

## 📈 Performance Optimizations

- Code splitting for faster initial load
- Asset compression and minification
- Lazy loading for non-critical components
- Optimized React component rendering
- Efficient state management with React Query

## 🤝 Support

For issues and feature requests, please create an issue on GitHub.