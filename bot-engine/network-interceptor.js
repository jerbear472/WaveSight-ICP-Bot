/**
 * Network Interceptor for Instagram
 * Captures API responses to extract complete post data
 */

class NetworkInterceptor {
  constructor(page) {
    this.page = page;
    this.capturedData = new Map();
    this.enabled = false;
  }

  async enable() {
    if (this.enabled) return;
    
    // Intercept network responses
    this.page.on('response', async (response) => {
      try {
        const url = response.url();
        
        // Instagram GraphQL endpoints that contain post data
        if (url.includes('/graphql/query') || 
            url.includes('/api/v1/feed') ||
            url.includes('/api/v1/media')) {
          
          const status = response.status();
          if (status === 200) {
            const contentType = response.headers()['content-type'] || '';
            
            if (contentType.includes('application/json')) {
              const body = await response.text();
              const data = JSON.parse(body);
              
              // Extract posts from different API formats
              const posts = this.extractPostsFromResponse(data);
              
              if (posts.length > 0) {
                posts.forEach(post => {
                  const postId = post.id || post.media_id || post.code;
                  if (postId) {
                    this.capturedData.set(postId, this.normalizePostData(post));
                  }
                });
                
                console.log(`📡 Captured ${posts.length} posts from API response`);
              }
            }
          }
        }
      } catch (error) {
        // Silently ignore parsing errors
      }
    });
    
    this.enabled = true;
  }

  extractPostsFromResponse(data) {
    const posts = [];
    
    // Try different response structures
    if (data.data?.user?.edge_owner_to_timeline_media?.edges) {
      // User timeline
      posts.push(...data.data.user.edge_owner_to_timeline_media.edges.map(e => e.node));
    } else if (data.data?.media) {
      // Single media
      posts.push(data.data.media);
    } else if (data.items) {
      // Feed items
      posts.push(...data.items);
    } else if (data.feed_items) {
      // Alternative feed structure
      data.feed_items.forEach(item => {
        if (item.media_or_ad) {
          posts.push(item.media_or_ad);
        }
      });
    }
    
    return posts;
  }

  normalizePostData(post) {
    // Handle different Instagram API response formats
    return {
      id: post.id || post.media_id || post.code,
      type: post.media_type === 1 ? 'photo' : post.media_type === 2 ? 'video' : 'carousel',
      caption: post.caption?.text || post.edge_media_to_caption?.edges?.[0]?.node?.text || '',
      username: post.user?.username || post.owner?.username || '',
      userId: post.user?.pk || post.owner?.id || '',
      likes: post.like_count || post.edge_liked_by?.count || 0,
      comments: post.comment_count || post.edge_media_to_comment?.count || 0,
      views: post.view_count || post.video_view_count || 0,
      plays: post.play_count || 0,
      isVideo: post.is_video || post.media_type === 2,
      videoUrl: post.video_url || post.video_versions?.[0]?.url,
      imageUrl: post.image_versions2?.candidates?.[0]?.url || post.display_url || post.thumbnail_src,
      timestamp: post.taken_at || post.taken_at_timestamp,
      location: post.location?.name || null,
      hashtags: this.extractHashtags(post.caption?.text || ''),
      mentions: this.extractMentions(post.caption?.text || ''),
      music: post.music_info || post.clips_metadata?.music_info || null,
      isSponsored: post.is_paid_partnership || false,
      productTags: post.product_tags || [],
      carouselMedia: post.carousel_media || []
    };
  }

  extractHashtags(text) {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
  }

  extractMentions(text) {
    const mentionRegex = /@[a-zA-Z0-9_.]+/g;
    const matches = text.match(mentionRegex);
    return matches ? matches : [];
  }

  getPostData(postId) {
    // Try different ID formats
    return this.capturedData.get(postId) || 
           Array.from(this.capturedData.values()).find(post => 
             post.id === postId || 
             post.code === postId ||
             post.imageUrl?.includes(postId)
           );
  }

  getAllCapturedData() {
    return Array.from(this.capturedData.values());
  }

  clear() {
    this.capturedData.clear();
  }
}

module.exports = NetworkInterceptor;