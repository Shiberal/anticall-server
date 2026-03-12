"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const schema_1 = require("./db/schema");
const auth_1 = require("./middleware/auth");
const lookup_1 = __importDefault(require("./routes/lookup"));
const reports_1 = __importDefault(require("./routes/reports"));
const blocklist_1 = __importDefault(require("./routes/blocklist"));
const federation_1 = __importDefault(require("./routes/federation"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
// Initialize database
(0, schema_1.initDb)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
app.use('/lookup', auth_1.authMiddleware, lookup_1.default);
app.use('/reports', auth_1.authMiddleware, reports_1.default);
app.use('/blocklist', auth_1.authMiddleware, blocklist_1.default);
// Federation routes (own auth)
app.use('/federation', federation_1.default);
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Federated Blocklist Server running on port ${PORT} (accessible on WiFi at http://<your-ip>:${PORT})`);
});
