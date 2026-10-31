import axios from 'axios';
import * as cheerio from 'cheerio';

export const scrapeProductPage = async (url) => {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 5000
        });

        const $ = cheerio.load(data);
        const title = $('title').text() || $('h1').first().text();
        const imageUrl = $('meta[property="og:image"]').attr('content') || "https://via.placeholder.com/300";

        if (!title) throw new Error("Title not found on page");

        return { title, imageUrl };

    } catch (error) {
        console.warn(`⚠️ Scraping skipped (${error.message}). Using Smart URL Fallback for: ${url}`);
        
        // 🚀 BULLETPROOF FALLBACK: Chahe jo error ho, code yahan se title nikal lega aur job pass kar dega
        try {
            const urlObj = new URL(url);
            // URL ke tukde karo, 'products' ya 'dp' jaise generic words ignore karo
            const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0 && p !== 'products' && p !== 'dp' && p !== 'p');
            
            let fallbackTitle = pathParts[pathParts.length - 1] || "trending product";
            fallbackTitle = fallbackTitle.replace(/[-_]/g, ' ').trim();
            fallbackTitle = fallbackTitle.replace(/\b\w/g, l => l.toUpperCase());

            return {
                title: fallbackTitle,
                imageUrl: "https://via.placeholder.com/300?text=Product"
            };
        } catch (fallbackError) {
            // Agar URL format hi galat ho toh default title de do, par crash mat ho!
            return {
                title: "Trending Product",
                imageUrl: "https://via.placeholder.com/300?text=Product"
            };
        }
    }
};