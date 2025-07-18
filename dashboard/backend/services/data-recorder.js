/**
 * Data Recorder Service
 * Handles inserting bot-discovered data into all Supabase tables
 */

class DataRecorder {
    constructor(supabase) {
        this.supabase = supabase;
    }

    /**
     * Record a content impression
     */
    async recordContentImpression(sessionId, content) {
        try {
            // Insert into content_impressions
            const impressionData = {
                session_id: sessionId,
                platform: content.platform,
                content_id: content.contentId,
                creator_username: content.creator,
                creator_handle: content.creatorHandle || content.creator,
                content_type: content.contentType || 'video',
                caption: content.caption,
                hashtags: content.hashtags || [],
                music_used: content.music || null,
                likes_count: content.likes || 0,
                comments_count: content.comments || 0,
                shares_count: content.shares || 0,
                saves_count: content.saves || 0,
                views_count: content.views || 0,
                engagement_rate: this.calculateEngagementRate(content),
                is_viral: this.isViral(content),
                dwell_time_seconds: content.dwellTime || 0,
                viewed_at: new Date().toISOString(),
                content_url: content.url || null,
                thumbnail_url: content.thumbnailUrl || null
            };

            const { error: impressionError } = await this.supabase
                .from('content_impressions')
                .insert(impressionData);

            if (impressionError) {
                console.error('Error recording impression:', impressionError);
            }

            // Update or insert creator profile
            await this.recordCreatorProfile(content);

            // Check if competitor content
            if (await this.isCompetitor(content.creator)) {
                await this.recordCompetitorContent(content);
            }

            // Extract and record trends
            await this.recordTrends(content);

            return impressionData;

        } catch (error) {
            console.error('Error in recordContentImpression:', error);
            throw error;
        }
    }

    /**
     * Record or update creator profile
     */
    async recordCreatorProfile(content) {
        try {
            const profileData = {
                username: content.creator,
                handle: content.creatorHandle || content.creator,
                platform: content.platform,
                display_name: content.creatorDisplayName || content.creator,
                bio: content.creatorBio || null,
                follower_count: content.creatorFollowers || 0,
                following_count: content.creatorFollowing || 0,
                total_likes: content.creatorTotalLikes || 0,
                total_posts: content.creatorPostCount || 0,
                average_engagement_rate: content.creatorAvgEngagement || 0,
                is_verified: content.creatorVerified || false,
                category: content.creatorCategory || null,
                profile_pic_url: content.creatorProfilePic || null,
                last_updated: new Date().toISOString()
            };

            // Upsert creator profile
            const { error } = await this.supabase
                .from('creator_profiles')
                .upsert(profileData, {
                    onConflict: 'username,platform'
                });

            if (error) {
                console.error('Error recording creator profile:', error);
            }

            // Check if trending creator
            if (this.isTrendingCreator(content)) {
                await this.recordTrendingCreator(content);
            }

        } catch (error) {
            console.error('Error in recordCreatorProfile:', error);
        }
    }

    /**
     * Record engagement event (like, follow, save, etc.)
     */
    async recordEngagement(sessionId, contentId, engagementType, creatorUsername) {
        try {
            const engagementData = {
                session_id: sessionId,
                content_id: contentId,
                engagement_type: engagementType, // 'like', 'follow', 'save', 'share', 'comment'
                creator_username: creatorUsername,
                engaged_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('engagement_events')
                .insert(engagementData);

            if (error) {
                console.error('Error recording engagement:', error);
            }

            // Update ICP engagement summary
            await this.updateICPEngagement(sessionId, engagementType);

        } catch (error) {
            console.error('Error in recordEngagement:', error);
        }
    }

    /**
     * Record competitor content
     */
    async recordCompetitorContent(content) {
        try {
            const competitorData = {
                competitor_name: content.creator,
                platform: content.platform,
                content_id: content.contentId,
                content_type: content.contentType || 'video',
                caption: content.caption,
                hashtags: content.hashtags || [],
                performance_metrics: {
                    likes: content.likes || 0,
                    comments: content.comments || 0,
                    shares: content.shares || 0,
                    views: content.views || 0,
                    engagement_rate: this.calculateEngagementRate(content)
                },
                posted_at: content.postedAt || new Date().toISOString(),
                discovered_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('competitor_content')
                .insert(competitorData);

            if (error) {
                console.error('Error recording competitor content:', error);
            }

        } catch (error) {
            console.error('Error in recordCompetitorContent:', error);
        }
    }

    /**
     * Record trends from content
     */
    async recordTrends(content) {
        try {
            // Record hashtag trends
            if (content.hashtags && content.hashtags.length > 0) {
                for (const hashtag of content.hashtags) {
                    await this.recordTrendMetric('hashtag', hashtag, content);
                }
            }

            // Record music/sound trends
            if (content.music) {
                await this.recordTrendMetric('sound', content.music, content);
            }

            // Record effect trends
            if (content.effects && content.effects.length > 0) {
                for (const effect of content.effects) {
                    await this.recordTrendMetric('effect', effect, content);
                }
            }

        } catch (error) {
            console.error('Error in recordTrends:', error);
        }
    }

    /**
     * Record individual trend metric
     */
    async recordTrendMetric(trendType, trendValue, content) {
        try {
            // First, check if trend exists
            const { data: existing } = await this.supabase
                .from('trend_metrics')
                .select('*')
                .eq('trend_type', trendType)
                .eq('trend_value', trendValue)
                .eq('platform', content.platform)
                .single();

            if (existing) {
                // Update existing trend
                const { error } = await this.supabase
                    .from('trend_metrics')
                    .update({
                        usage_count: existing.usage_count + 1,
                        total_engagement: existing.total_engagement + (content.likes || 0) + (content.comments || 0),
                        viral_content_count: existing.viral_content_count + (this.isViral(content) ? 1 : 0),
                        last_seen: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                if (error) console.error('Error updating trend:', error);
            } else {
                // Create new trend
                const { error } = await this.supabase
                    .from('trend_metrics')
                    .insert({
                        platform: content.platform,
                        trend_type: trendType,
                        trend_value: trendValue,
                        usage_count: 1,
                        total_engagement: (content.likes || 0) + (content.comments || 0),
                        viral_content_count: this.isViral(content) ? 1 : 0,
                        first_seen: new Date().toISOString(),
                        last_seen: new Date().toISOString()
                    });

                if (error) console.error('Error creating trend:', error);
            }

        } catch (error) {
            console.error('Error in recordTrendMetric:', error);
        }
    }

    /**
     * Record trending creator
     */
    async recordTrendingCreator(content) {
        try {
            const trendingData = {
                creator_username: content.creator,
                platform: content.platform,
                trending_score: this.calculateTrendingScore(content),
                growth_rate: content.creatorGrowthRate || 0,
                viral_content_count: 1,
                average_views: content.views || 0,
                trending_since: new Date().toISOString(),
                last_updated: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('trending_creators_breakdown')
                .upsert(trendingData, {
                    onConflict: 'creator_username,platform'
                });

            if (error) {
                console.error('Error recording trending creator:', error);
            }

        } catch (error) {
            console.error('Error in recordTrendingCreator:', error);
        }
    }

    /**
     * Update ICP engagement summary
     */
    async updateICPEngagement(sessionId, engagementType) {
        try {
            // Get session info to find ICP profile
            const { data: session } = await this.supabase
                .from('bot_sessions')
                .select('profile_type')
                .eq('session_id', sessionId)
                .single();

            if (!session) return;

            // Get current date for time period
            const today = new Date().toISOString().split('T')[0];

            // Check if summary exists
            const { data: existing } = await this.supabase
                .from('icp_engagement_summary')
                .select('*')
                .eq('icp_type', session.profile_type)
                .eq('time_period', today)
                .single();

            if (existing) {
                // Update existing summary
                const updates = {
                    total_engagements: existing.total_engagements + 1,
                    last_updated: new Date().toISOString()
                };

                // Update specific engagement type count
                if (engagementType === 'like') updates.like_count = (existing.like_count || 0) + 1;
                if (engagementType === 'follow') updates.follow_count = (existing.follow_count || 0) + 1;
                if (engagementType === 'save') updates.save_count = (existing.save_count || 0) + 1;
                if (engagementType === 'share') updates.share_count = (existing.share_count || 0) + 1;

                const { error } = await this.supabase
                    .from('icp_engagement_summary')
                    .update(updates)
                    .eq('id', existing.id);

                if (error) console.error('Error updating ICP engagement:', error);
            } else {
                // Create new summary
                const summaryData = {
                    icp_type: session.profile_type,
                    time_period: today,
                    total_engagements: 1,
                    like_count: engagementType === 'like' ? 1 : 0,
                    follow_count: engagementType === 'follow' ? 1 : 0,
                    save_count: engagementType === 'save' ? 1 : 0,
                    share_count: engagementType === 'share' ? 1 : 0,
                    average_engagement_rate: 0,
                    top_content_categories: [],
                    last_updated: new Date().toISOString()
                };

                const { error } = await this.supabase
                    .from('icp_engagement_summary')
                    .insert(summaryData);

                if (error) console.error('Error creating ICP engagement:', error);
            }

        } catch (error) {
            console.error('Error in updateICPEngagement:', error);
        }
    }

    // Helper functions
    calculateEngagementRate(content) {
        const totalEngagement = (content.likes || 0) + (content.comments || 0) + (content.shares || 0) + (content.saves || 0);
        const views = content.views || 1;
        return (totalEngagement / views) * 100;
    }

    isViral(content) {
        const engagementRate = this.calculateEngagementRate(content);
        return content.likes > 100000 || engagementRate > 10 || content.views > 1000000;
    }

    isTrendingCreator(content) {
        return content.creatorFollowers > 100000 || 
               content.creatorGrowthRate > 0.1 || 
               this.isViral(content);
    }

    async isCompetitor(username) {
        // Check if username is in competitor list
        // This could be configured in environment or database
        const competitors = process.env.COMPETITORS?.split(',') || [];
        return competitors.includes(username);
    }

    calculateTrendingScore(content) {
        const engagementRate = this.calculateEngagementRate(content);
        const viralFactor = this.isViral(content) ? 2 : 1;
        const followerFactor = Math.log10(content.creatorFollowers || 1);
        return (engagementRate * viralFactor * followerFactor).toFixed(2);
    }
}

module.exports = DataRecorder;