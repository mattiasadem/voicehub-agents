# Useful Apify Actors for VoiceHub AI Workforce

## Lead Generation (Scout-Alpha)

| Actor | ID | Use Case | Cost | Notes |
|-------|-----|----------|------|-------|
| **Tweet Scraper V2** | `apidojo/tweet-scraper` | Twitter/X lead signals | $0.40/1k tweets | 30-80 tweets/sec, advanced search queries |
| **Twitter Scraper Unlimited** | `apidojo/twitter-scraper-lite` | Small Twitter batches | Event-based | No 50-tweet minimum, conversations OK |
| **Website Content Crawler** | `apify/website-content-crawler` | Extract company sites | Free tier + usage | Markdown export, good for enrichment |
| **Google Maps Scraper** | `compass/crawler-google-places` | Local business leads | Pay per result | Gets emails, phones, reviews |
| **Facebook Posts Scraper** | `apify/facebook-posts-scraper` | FB business pages | Pay per result | Local business signals |
| **Instagram Scraper** | `apify/instagram-scraper` | IG business leads | $0.40/1k posts | Visual-first businesses (salons, etc) |

### Recommended Query Patterns for Scout:
```
Twitter: ("hiring receptionist" OR "missed calls" OR "phone anxiety") (startup OR "small business") filter:links
Google Maps: "pest control" OR "salon" OR "plumber" + city + "phone"
```

## Competitive Intelligence (Intel-9)

| Actor | ID | Use Case | Cost |
|-------|-----|----------|------|
| **Website Content Crawler** | `apify/website-content-crawler` | Pricing/feature monitoring | Free tier |
| **E-commerce Scraping Tool** | `apify/e-commerce-scraping-tool` | Competitor pricing | Pay per result |
| **Screenshot & Web Archive** | `apify/screenshotter` | Visual tracking | Credit-based |

### Intel-9 Monitoring Strategy:
1. Daily crawl competitor pricing pages
2. Weekly screenshot of key landing pages
3. Alert on content changes > 20% similarity

## SEO & Marketing (Rank-4, Ghost-9)

| Actor | ID | Use Case | Cost |
|-------|-----|----------|------|
| **Website Content Crawler** | `apify/website-content-crawler` | Content extraction | Free tier |
| **YouTube Scraper** | `streamers/youtube-scraper` | Video SEO | $0.40/1k videos |
| **TikTok Scraper** | `clockworks/tiktok-scraper` | Short-form trends | Pay per result |

## Content Research (Blog-Bot, Ghost-9)

| Actor | ID | Use Case | Cost |
|-------|-----|----------|------|
| **Website Content Crawler** | `apify/website-content-crawler` | Research sources | Free tier |
| **Google News Scraper** | `apify/google-news-scraper` | Industry news | Pay per result |

## Customer Success (Health-5, Support-1)

| Actor | ID | Use Case | Cost |
|-------|-----|----------|------|
| **Review Scraper** | `apify/google-reviews-scraper` | Sentiment analysis | Pay per result |

## Quick Start Commands

```bash
# Scout-alpha: Twitter leads
apify run apidojo/tweet-scraper -p '{"searchTerms":["hiring receptionist OR \"missed calls\""], "maxItems": 100}'

# Scout-alpha: Company enrichment  
apify run apify/website-content-crawler -p '{"startUrls": ["https://example.com"], "maxCrawlDepth": 1}'

# Intel-9: Competitor monitoring
apify run apify/website-content-crawler -p '{"startUrls": ["https://smith.ai/pricing", "https://nexa.ai/pricing"], "crawlType": "static"}'
```

## Cost Estimates

| Agent | Monthly Runs | Actor Cost Est. |
|-------|--------------|-----------------|
| Scout-alpha | 180 runs (every 4h) | $20-50 (depends on volume) |
| Intel-9 | 30 runs (daily) | $10-20 |
| Rank-4 | 30 runs (daily) | $5-10 |
| Ghost-9 | 30 runs | $10-20 |
| **Total** | | **$45-100/month** |

## Free Tier Limits
- `apify/website-content-crawler`: 10k pages/month free
- `apidojo/tweet-scraper`: 10 tweets free (per run), then $0.40/1k
- Most actors: Free tier available for light usage

## Integration Notes

Add to agent cronjobs:
```json
{
  "env": {
    "APIFY_TOKEN": "${APIFY_TOKEN}",
    "APIFY_ACTORS": {
      "reddit": "optional/reddit-scraper",
      "twitter": "apidojo/tweet-scraper",
      "website": "apify/website-content-crawler"
    }
  }
}
```

## Priority Setup Order
1. ✅ Scout-alpha: `apidojo/tweet-scraper` (Twitter leads)
2. ✅ Intel-9: `apify/website-content-crawler` (competitor monitoring)
3. 🔄 Ghost-9: `apify/website-content-crawler` (content research)
4. ⏳ Scout-alpha bonus: `compass/crawler-google-places` (local business leads)
