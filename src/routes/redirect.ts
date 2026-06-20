import { Request, Response } from 'express';
import redis from '../config/redis';

export async function handleRedirect(req: Request, res: Response): Promise<void> {
  const { shortCode } = req.params;
  const shortCodeStr = Array.isArray(shortCode) ? shortCode[0] : shortCode;

  try {
    // Check Redis Cache
    const cachedUrl = await redis.get(`url:${shortCodeStr}`);

    if (cachedUrl) {
      // Cache hit - redirect immediately
      const urlData = JSON.parse(cachedUrl);

      // Increment click count in cache
      await redis.incr(`clicks:${shortCodeStr}`);

      res.redirect(302, urlData.originalUrl);
      return;
    }

    // Cache miss - URL not found
    res.status(404).json({ error: 'URL not found' });
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
