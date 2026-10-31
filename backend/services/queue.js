import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

import { scrapeProductPage } from './scraper.js';
import { analyzeProductImage, scoreVideoMatch } from './brain.js';
import { fetchInstagramReels, fetchMetaAds } from './sources.js';
import { initDB, isVideoDuplicate, saveVideo } from './db.js';
import { sendProgress } from '../server.js';

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null
});

// Initialize DB Promise
const dbPromise = initDB();

export const searchQueue = new Queue('SearchQueue', { connection });

const worker = new Worker('SearchQueue', async (job) => {
    const { searchId, query, type } = job.data;
    const db = await dbPromise;

    // Save search to history
    await db.run('INSERT INTO searches (id, query, type) VALUES (?, ?, ?)', [searchId, query, type]);

    let productDetails = { title: query, description: "", imageUrl: "https://via.placeholder.com/300" };

    try {
        // 1. Scrape URL if needed
        if (type === 'url') {
            sendProgress(searchId, 'Scraping product page...', 'processing');
            productDetails = await scrapeProductPage(query);
            sendProgress(searchId, `Found product: ${productDetails.title}`, 'processing');
        }

        // 2. AI Image Analysis
        sendProgress(searchId, 'Analyzing product with AI Brain...', 'processing');
        const aiAnalysis = await analyzeProductImage(productDetails.imageUrl, productDetails.title);
        
        // 3. Fetch Videos from Instagram & Meta (In Parallel)
        sendProgress(searchId, 'Searching Instagram and Meta Ad Library in parallel...', 'processing');
        
        // 🚀 ULTIMATE KEYWORD LOGIC FOR DEMO:
        const cleanTitle = productDetails.title.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Website ke words ko ignore karne ki list
        const ignoreWords = ['http', 'https', 'www', 'com', 'in', 'co', 'store', 'shop', 'product'];
        
        // Chhote words aur link words hata do
        const words = cleanTitle.split(' ').filter(w => 
            w.length > 2 && 
            isNaN(w) && 
            !ignoreWords.includes(w.toLowerCase())
        ); 
        
        // URL slug mein asli product hamesha aakhir mein hota hai
        const targetWords = words.length >= 3 ? `${words[words.length-2]} ${words[words.length-1]}` : words.join(' ');
        const shortKeyword = targetWords || "trending product"; 
        
        const igHashtag = shortKeyword.replace(/\s+/g, '').toLowerCase();
        
        console.log(`Extracted Smart Keyword: ${shortKeyword}, Hashtag: #${igHashtag}`);

        const [igVideos, metaVideos] = await Promise.all([
            fetchInstagramReels([igHashtag, `${igHashtag}toy`, 'viralproduct']),
            fetchMetaAds(shortKeyword)
        ]);
        
        const allVideos = [...igVideos, ...metaVideos];
        sendProgress(searchId, `Found ${allVideos.length} raw videos. Processing & Deduplicating...`, 'processing');

        // 4. Deduplication & Scoring
        const finalResults = [];
        let validIgCount = 0;
        let validMetaCount = 0;

        for (const video of allVideos) {
            // Check if we've seen this exact video before
            const isDuplicate = await isVideoDuplicate(db, video.unique_video_id);
            if (isDuplicate) continue;

            // Score the video using our Mock AI
            const analysis = await scoreVideoMatch(productDetails.imageUrl, video.thumbnail_url);
            
            // Only keep videos with a score >= 70 (Our threshold)
            if (analysis.score >= 70) {
                video.match_score = analysis.score;
                video.match_reason = analysis.reason;
                
                // Save to DB so it never shows up again in future searches
                await saveVideo(
                    db, searchId, video.platform, video.unique_video_id, 
                    video.video_url, video.thumbnail_url, video.caption, analysis.score
                );

                finalResults.push(video);
                
                if (video.platform === 'instagram') validIgCount++;
                if (video.platform === 'meta') validMetaCount++;
            }
        }

        // 5. Completion!
        sendProgress(searchId, 'Search and Deduplication complete!', 'completed');
        
        return { 
            success: true, 
            productDetails, 
            aiAnalysis, 
            counts: { instagram: validIgCount, meta: validMetaCount },
            results: finalResults 
        };

    } catch (error) {
        console.error(`Job Failed:`, error.message);
        sendProgress(searchId, `Error: ${error.message}`, 'error');
        throw error;
    }
}, { connection });

worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error ${err.message}`);
});