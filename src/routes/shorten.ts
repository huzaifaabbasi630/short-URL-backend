import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import redis from '../config/redis';

export async function handleShorten(req: Request, res: Response): Promise<void> {
  const { originalUrl, customBackhalf } = req.body;

  // Validate URL
  if (!originalUrl) {
    res.status(400).json({ error: 'Original URL is required' });
    return;
  }

  try {
    // More lenient URL validation
    try {
      new URL(originalUrl);
    } catch (e) {
      // If URL parsing fails, try adding https://
      try {
        new URL('https://' + originalUrl);
      } catch (e2) {
        res.status(400).json({ error: 'Invalid URL format' });
        return;
      }
    }

    // Generate short code
    let shortCode: string;
    if (customBackhalf) {
      // Validate custom backhalf
      if (!/^[a-zA-Z0-9-_]+$/.test(customBackhalf)) {
        res.status(400).json({ error: 'Custom backhalf can only contain alphanumeric characters, hyphens, and underscores' });
        return;
      }

      // Check if custom backhalf already exists in Redis
      const existingUrl = await redis.get(`url:${customBackhalf}`);
      if (existingUrl) {
        res.status(409).json({ error: 'Custom backhalf already in use' });
        return;
      }

      shortCode = customBackhalf;
    } else {
      // Generate unique 6-character short code
      shortCode = nanoid(6);

      // Ensure uniqueness in Redis
      let existingUrl = await redis.get(`url:${shortCode}`);
      let attempts = 0;
      while (existingUrl && attempts < 10) {
        shortCode = nanoid(6);
        existingUrl = await redis.get(`url:${shortCode}`);
        attempts++;
      }

      if (existingUrl) {
        res.status(500).json({ error: 'Failed to generate unique short code' });
        return;
      }
    }

    // Create URL object
    const newUrl = {
      shortCode,
      originalUrl,
      customBackhalf: customBackhalf || undefined,
      createdAt: new Date(),
    };

    // Store in Redis (TTL: 1 hour)
    await redis.setex(`url:${shortCode}`, 3600, JSON.stringify(newUrl));

    res.status(201).json({
      shortCode: newUrl.shortCode,
      originalUrl: newUrl.originalUrl,
      shortUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/${newUrl.shortCode}`,
      createdAt: newUrl.createdAt,
    });
  } catch (error) {
    console.error('Shorten error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
