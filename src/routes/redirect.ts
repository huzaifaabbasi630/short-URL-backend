import { Request, Response } from 'express';
import Url from '../models/Url';
import Analytics from '../models/Analytics';
import redis from '../config/redis';
import { extractAnalytics } from '../utils/analytics';

export async function handleRedirect(req: Request, res: Response): Promise<void> {
  const { shortCode } = req.params;
  const shortCodeStr = Array.isArray(shortCode) ? shortCode[0] : shortCode;

  try {
    // Step 1: Check Redis Cache
    const cachedUrl = await redis.get(`url:${shortCodeStr}`);

    if (cachedUrl) {
      // Cache hit - redirect immediately
      const urlData = JSON.parse(cachedUrl);

      // Background analytics processing (non-blocking)
      processAnalyticsAsync(shortCodeStr, req);

      // Increment click count in cache
      await redis.incr(`clicks:${shortCodeStr}`);

      res.redirect(302, urlData.originalUrl);
      return;
    }

    // Step 2: Cache Miss - Try MongoDB (optional)
    try {
      const urlDoc = await Url.findOne({ shortCode: shortCodeStr });

      if (!urlDoc) {
        res.status(404).json({ error: 'URL not found' });
        return;
      }

      // Check if URL has expired
      if (urlDoc.expiresAt && new Date() > urlDoc.expiresAt) {
        res.status(410).json({ error: 'URL has expired' });
        return;
      }

      // Check if URL is password protected
      if (urlDoc.password) {
        // For password-protected URLs, return a special response
        // The frontend will handle the password input
        res.status(403).json({
          error: 'Password protected',
          requiresPassword: true,
          shortCode: shortCodeStr,
        });
        return;
      }

      // Save to Redis cache for future requests (TTL: 1 hour)
      await redis.setex(`url:${shortCodeStr}`, 3600, JSON.stringify(urlDoc.toObject()));

      // Background analytics processing (non-blocking)
      processAnalyticsAsync(shortCodeStr, req);

      // Increment click count
      urlDoc.totalClicks += 1;
      await urlDoc.save();

      // Redirect to original URL
      res.redirect(302, urlDoc.originalUrl);
    } catch (dbError) {
      console.warn('Database query failed, URL not found in cache:', dbError);
      res.status(404).json({ error: 'URL not found' });
    }
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function processAnalyticsAsync(shortCode: string, req: Request): Promise<void> {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '0.0.0.0';
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader || 'Unknown';

    const analytics = extractAnalytics(ipAddress, userAgent);

    // Try to save analytics, but don't fail if database is unavailable
    try {
      await Analytics.create({
        shortCode,
        ipAddress,
        ...analytics,
      });
    } catch (dbError) {
      console.warn('Failed to save analytics (database unavailable):', dbError);
    }
  } catch (error) {
    console.error('Analytics processing error:', error);
    // Don't throw - analytics failures shouldn't break the redirect
  }
}
