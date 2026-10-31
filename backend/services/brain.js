// Mock AI Brain Service - No API Key Required!

// 1. Mock: Extract visual attributes and generate search queries
export const analyzeProductImage = async (imageUrl, productName = "") => {
    try {
        // Simulate real AI network delay (1.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Fake realistic response based on the input name or a default
        const name = productName || "product";
        
        return {
            attributes: [
                "black color", 
                "cotton material", 
                "white text logo", 
                "casual wear", 
                "apparel"
            ],
            searchQueries: [
                `${name} aesthetic`,
                `#${name.replace(/\s+/g, '')}`,
                "black casual apparel",
                "trending style review",
                "#productreview"
            ]
        };
    } catch (error) {
        console.error("Mock Brain Analysis Error:", error.message);
        throw new Error("Failed to analyze product image.");
    }
};

// 2. Mock: Score a video thumbnail against the original product image (0-100)
export const scoreVideoMatch = async (originalImageUrl, videoThumbnailUrl) => {
    try {
        // Simulate real AI network delay (1 second)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Generate a random score between 65 and 98 to simulate AI variation
        const randomScore = Math.floor(Math.random() * (98 - 65 + 1)) + 65;

        return {
            score: randomScore,
            reason: "The video thumbnail visually matches the core shape, color, and logo placement of the original product image."
        };
    } catch (error) {
        console.error("Mock Scoring Error:", error.message);
        return { score: 0, reason: "Analysis failed." };
    }
};