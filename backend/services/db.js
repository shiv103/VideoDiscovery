import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';

// Initialize SQLite database
export const initDB = async () => {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    // Create Searches Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS searches (
            id TEXT PRIMARY KEY,
            query TEXT,
            type TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Create Videos Table (For De-duplication)
    // unique_id ensures we can check if we've seen this exact video before
    await db.exec(`
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_id TEXT,
            platform TEXT,
            unique_video_id TEXT,
            video_url TEXT,
            thumbnail_url TEXT,
            caption TEXT,
            match_score INTEGER,
            FOREIGN KEY(search_id) REFERENCES searches(id)
        );
    `);

    return db;
};

// Helper: Check if video was already shown in any past search
export const isVideoDuplicate = async (db, uniqueVideoId) => {
    const row = await db.get('SELECT id FROM videos WHERE unique_video_id = ?', [uniqueVideoId]);
    return !!row;
};

// Helper: Save video to database
export const saveVideo = async (db, searchId, platform, uniqueVideoId, videoUrl, thumbnailUrl, caption, score) => {
    await db.run(
        'INSERT INTO videos (search_id, platform, unique_video_id, video_url, thumbnail_url, caption, match_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [searchId, platform, uniqueVideoId, videoUrl, thumbnailUrl, caption, score]
    );
};