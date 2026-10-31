import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { searchQueue } from './services/queue.js';
import { initDB } from './services/db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize DB Promise for reading data
const dbPromise = initDB();

// Keep track of connected clients for live progress updates
let clients = [];

// 1. SSE Endpoint for live progress
app.get('/api/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    clients.push(res);
    req.on('close', () => {
        clients = clients.filter(client => client !== res);
    });
});

// Helper to send progress to frontend
export const sendProgress = (searchId, message, status = 'processing') => {
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify({ searchId, message, status })}\n\n`);
    });
};

// 2. Main POST Search Endpoint
app.post('/api/search', async (req, res) => {
    const { query, type } = req.body; 
    
    if (!query || !type) {
        return res.status(400).json({ error: "Missing query or type (url/keyword)" });
    }

    const searchId = Date.now().toString();
    res.status(202).json({ searchId, message: "Search started" });

    sendProgress(searchId, 'Starting search pipeline...', 'processing');
    
    await searchQueue.add('processSearch', { searchId, query, type });
});

// 3. GET Search History (Assignment Requirement)
app.get('/api/history', async (req, res) => {
    try {
        const db = await dbPromise;
        const history = await db.all('SELECT * FROM searches ORDER BY timestamp DESC');
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. GET Videos for a specific search
app.get('/api/search/:id', async (req, res) => {
    try {
        const db = await dbPromise;
        const searchInfo = await db.get('SELECT * FROM searches WHERE id = ?', [req.params.id]);
        
        if (!searchInfo) {
            return res.status(404).json({ error: "Search not found" });
        }

        const videos = await db.all('SELECT * FROM videos WHERE search_id = ? ORDER BY match_score DESC', [req.params.id]);
        
        res.json({ search: searchInfo, videos });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));