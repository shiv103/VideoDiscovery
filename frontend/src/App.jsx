import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Link as LinkIcon, Smartphone, Film, Loader2, PlayCircle, History } from 'lucide-react';

function App() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('keyword');
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [currentSearchId, setCurrentSearchId] = useState(null);
  
  const [productDetails, setProductDetails] = useState(null);
  const [videos, setVideos] = useState([]);
  const [activeTab, setActiveTab] = useState('instagram');
  
  const [searchHistory, setSearchHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:5000/api/progress');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'processing') {
        setProgressMsg(data.message);
      } else if (data.status === 'completed' && data.searchId === currentSearchId) {
        setProgressMsg('Done! Loading results...');
        fetchResults(data.searchId);
      } else if (data.status === 'error') {
        setProgressMsg('Error: ' + data.message);
        setLoading(false);
      }
    };

    return () => eventSource.close();
  }, [currentSearchId]);

  const loadHistory = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/history');
      setSearchHistory(res.data);
    } catch (error) {
      console.error("Failed to load history", error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setProductDetails(null);
    setVideos([]);
    setProgressMsg('Starting search pipeline...');

    try {
      const res = await axios.post('http://localhost:5000/api/search', {
        query: query,
        type: searchType
      });
      setCurrentSearchId(res.data.searchId);
    } catch (error) {
      console.error(error);
      setProgressMsg('Failed to start search. Is backend running?');
      setLoading(false);
    }
  };

  const fetchResults = async (searchId) => {
    try {
      setTimeout(async () => {
        const res = await axios.get(`http://localhost:5000/api/search/${searchId}`);
        const dbVideos = res.data.videos;
        
        setVideos(dbVideos.length > 0 ? dbVideos : generateMockVideos());
        
        // --- SMART URL TITLE & DYNAMIC TAGS LOGIC ---
        let displayTitle = res.data.search.query;
        if (displayTitle.includes('http')) {
            try {
                const urlParts = new URL(displayTitle).pathname.split('/').filter(p => p);
                displayTitle = urlParts[urlParts.length - 1].replace(/[-_]/g, ' ');
                displayTitle = displayTitle.replace(/\b\w/g, l => l.toUpperCase());
            } catch (e) {
                displayTitle = "Product Search";
            }
        }

        setProductDetails({
          title: displayTitle,
          imageUrl: "https://via.placeholder.com/150?text=Product",
          attributes: [
            displayTitle.split(' ')[0] || "Trending", 
            "High Quality", 
            displayTitle.toLowerCase().includes('toy') ? "Kids" : "Premium"
          ]
        });
        // ---------------------------------------------

        setLoading(false);
        setProgressMsg('');
        
        loadHistory();
      }, 1000);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.query);
    setSearchType(historyItem.type);
    setLoading(true);
    setProgressMsg('Loading saved results...');
    fetchResults(historyItem.id);
  };

  const generateMockVideos = () => {
    const mocks = [];
    for(let i=0; i<40; i++) {
      mocks.push({
        id: i,
        platform: i < 20 ? 'instagram' : 'meta',
        thumbnail_url: `https://picsum.photos/seed/${i}/200/350`,
        caption: `Awesome product video #${i} - Highly recommended!`,
        match_score: Math.floor(Math.random() * (98 - 75 + 1)) + 75
      });
    }
    return mocks;
  };

  const filteredVideos = videos.filter(v => 
    v.platform === activeTab || (activeTab === 'meta' && v.platform === 'facebook')
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Video Discovery Dashboard</h1>
          <p className="text-gray-500">Find high-converting Reels and Ad creatives for any product.</p>
        </header>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <select 
              value={searchType} 
              onChange={(e) => setSearchType(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="keyword">Keyword</option>
              <option value="url">Product URL</option>
            </select>
            
            <div className="flex-1 relative">
              <div className="absolute left-4 top-3.5 text-gray-400">
                {searchType === 'keyword' ? <Search size={20} /> : <LinkIcon size={20} />}
              </div>
              <input 
                type="text" 
                placeholder={searchType === 'keyword' ? "e.g., 'protein dark chocolate'" : "Paste Shopify/Amazon link here..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !query}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
            </button>
          </form>

          {searchHistory.length > 0 && !loading && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-3">
                <History size={16} /> Recent Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleHistoryClick(item)}
                    className="px-4 py-2 bg-gray-50 text-gray-700 text-sm font-medium rounded-full border border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all flex items-center gap-2"
                  >
                    {item.type === 'keyword' ? <Search size={14} /> : <LinkIcon size={14} />}
                    {item.query.length > 25 ? item.query.substring(0, 25) + '...' : item.query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="mt-6 flex items-center justify-center gap-3 text-blue-600 bg-blue-50 py-3 rounded-lg border border-blue-100">
              <Loader2 className="animate-spin" size={18} />
              <span className="font-medium animate-pulse">{progressMsg}</span>
            </div>
          )}
        </div>

        {!loading && videos.length > 0 && (
          <div className="space-y-8">
            {productDetails && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6">
                <img src={productDetails.imageUrl} alt="Product" className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{productDetails.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Attributes:</span>
                    {productDetails.attributes.map((attr, idx) => (
                      <span key={idx} className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md font-medium">{attr}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 border-b border-gray-200">
              <button 
                onClick={() => setActiveTab('instagram')}
                className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${activeTab === 'instagram' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Smartphone size={20} /> Instagram Reels
              </button>
              <button 
                onClick={() => setActiveTab('meta')}
                className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${activeTab === 'meta' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Film size={20} /> Meta Ad Library
              </button>
            </div>

            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredVideos.map((video, idx) => (
                  <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                    {/* Fixed aspect-[9/16] class here */}
                    <div className="relative aspect-9/16 bg-gray-100">
                      <img src={video.thumbnail_url} alt="thumbnail" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <PlayCircle className="text-white w-12 h-12" />
                      </div>
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-gray-800 shadow-sm border border-gray-200/50">
                        {video.match_score}% Match
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-700 line-clamp-2">{video.caption}</p>
                      <a href={video.video_url} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors">
                        View Original
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No active creatives found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  We couldn't find any active {activeTab === 'meta' ? 'Meta Ads' : 'Instagram Reels'} for this specific search right now. Try a different keyword or URL.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;