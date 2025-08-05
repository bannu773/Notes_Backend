# Zen Coder Notes Backend

Express.js backend with MongoDB for the Interview Preparation Notes application.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

Make sure your `.env` file contains:
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 5000)
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:5173)

## API Endpoints

- `GET /health` - Health check
- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `GET /api/notes/categories/list` - Get categories
- `GET /api/notes/stats/overview` - Get statistics

## MongoDB Schema

Notes are stored with the following structure:
- title, content, category, language (required)
- tags, priority, isRevision (optional)
- topicContent, codeContent (for revision notes)
- timestamps (createdAt, updatedAt)