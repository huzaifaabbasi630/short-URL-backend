import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import connectDB from './config/database';
import { handleRedirect } from './routes/redirect';
import { handleShorten } from './routes/shorten';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for accurate IP detection
app.set('trust proxy', true);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/api/v1/shorten', handleShorten);

// Redirect route (must be last to catch all short codes)
app.get('/:shortCode', handleRedirect);

// Start server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  const db = await connectDB();
  if (db) {
    console.log('Database connected successfully');
  } else {
    console.log('Running without database connection');
  }
});

export default app;
