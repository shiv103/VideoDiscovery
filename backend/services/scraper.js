import axios from 'axios';
import * as cheerio from 'cheerio';

export const scrapeProductPage = async (url) => {
    try {
        // Pretend to be a real browser to avoid getting blocked
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);

        // Try to get OpenGraph meta tags first (most reliable for Shopify/E-commerce)
        let title = $('meta[property="og:title"]').attr('content') || $('title').text();
        let description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        let imageUrl = $('meta[property="og:image"]').attr('content');

        // Amazon fallback (they don't always use og:tags)
        if (!imageUrl) {
            imageUrl = $('#landingImage').attr('src'); // Amazon main image ID
        }

        return {
            title: title ? title.trim() : null,
            description: description ? description.trim() : null,
            imageUrl: imageUrl || null
        };
    } catch (error) {
        console.error("Error scraping product page:", error.message);
        throw new Error("Could not fetch product details from the provided URL.");
    }
};