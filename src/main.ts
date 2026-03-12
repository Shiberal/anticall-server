import express from 'express';
import cors from 'cors';
import { initDb } from './db/schema';
import { authMiddleware } from './middleware/auth';
import lookupRoutes from './routes/lookup';
import reportRoutes from './routes/reports';
import blocklistRoutes from './routes/blocklist';
import federationRoutes from './routes/federation';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize database
initDb();

app.use(cors());
app.use(express.json());

// Public routes (if any)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Config (min votes per type) - read from env
app.get('/config', (req, res) => {
  res.json({
    minVotesSpam: parseInt(process.env.MIN_VOTES_SPAM || process.env.MIN_VOTES || '3', 10),
    minVotesTelemarketer: parseInt(process.env.MIN_VOTES_TELEMARKETER || process.env.MIN_VOTES || '3', 10),
    minVotesHarassment: parseInt(process.env.MIN_VOTES_HARASSMENT || process.env.MIN_VOTES || '3', 10),
  });
});

// Auth protected routes
app.use('/lookup', authMiddleware, lookupRoutes);
app.use('/reports', authMiddleware, reportRoutes);
app.use('/blocklist', authMiddleware, blocklistRoutes);

// Federation routes (own auth)
app.use('/federation', federationRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Federated Blocklist Server running on port ${PORT} (accessible on WiFi at http://<your-ip>:${PORT})`);
});
