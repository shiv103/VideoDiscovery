# Product Video Discovery Dashboard

A full-stack application that discovers high-converting video creatives (Instagram Reels & Meta Ads) for any given product keyword or e-commerce URL.

## 🚀 Setup Steps
1. **Clone the repository:** `git clone <your-repo-link>`
2. **Backend Setup:**
   - `cd backend`
   - `npm install`
   - Copy `.env.example` to `.env` and add your Apify token & Redis URL.
   - Start Redis server (locally or via Upstash/Docker).
   - `npm run dev`
3. **Frontend Setup:**
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## 🏗️ Architecture
- **Frontend:** React.js, Tailwind CSS, Lucide Icons. Uses Server-Sent Events (SSE) for real-time pipeline progress updates.
- **Backend:** Node.js, Express.
- **Queue/Background Jobs:** BullMQ with Redis for asynchronous scraper execution without blocking the main thread.
- **Database:** SQLite for caching searches and video de-duplication.

## 🎥 How Each Video Source is Collected
- **Instagram Reels:** Extracted using the `apify/instagram-hashtag-scraper` actor. The system converts long product titles into optimized, short hashtags (without spaces/special characters) to guarantee results.
- **Meta Ad Library:** Extracted using `apify/facebook-ads-scraper`. The system constructs strict `startUrls` with country targeting. 
- *Fallback Mechanism:* If Meta blocks the scraper (429 Rate Limit) or a URL fails, a graceful fallback mechanism injects high-quality mock ad data to ensure the UI never breaks.

## 🧠 How the Image Brain Works
Due to API cost constraints, the OpenAI Vision API is simulated using a "Mock AI Brain". 
1. It parses the incoming product title/URL.
2. Extracts core keywords and generates relevant hashtags.
3. Once raw videos are scraped, it iterates through them and assigns a "Match Score" (70-100) based on relevance. Videos scoring below 70 are discarded.

## 🛡️ De-Duplication Strategy
- Every scraped video comes with a `unique_video_id` (Instagram shortcode or FB Ad ID).
- Before saving a video or passing it to the frontend, the system checks the SQLite database using an `isVideoDuplicate` function.
- If the ID exists, it is skipped. This ensures repeat searches load instantly from the DB and never show duplicates.

## ⚠️ Known Limitations
- **Apify Free Tier Limits:** Extensive consecutive searches might trigger 429 Rate Limit errors or temporary blocks from Meta. 
- **Mock AI:** Actual image pixel analysis is mocked; it currently relies heavily on text/title processing.

## 🔮 What I Would Build Next
1. Integrate real OpenAI Vision API for pixel-perfect frame analysis.
2. Add TikTok and YouTube Shorts scrapers.
3. Implement user authentication and saved video collections.