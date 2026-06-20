import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import Url from '../models/Url';
import redis from '../config/redis';

export async function handleShorten(req: Request, res: Response): Promise<void> {
  const { originalUrl, customBackhalf } = req.body;

  // Validate URL
  if (!originalUrl) {
    res.status(400).json({ error: 'Original URL is required' });
    return;
  }

  try {
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(originalUrl)) {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    // Generate short code
    let shortCode: string;
    if (customBackhalf) {
      // Validate custom backhalf
      if (!/^[a-zA-Z0-9-_]+$/.test(customBackhalf)) {
        res.status(400).json({ error: 'Custom backhalf can only contain alphanumeric characters, hyphens, and underscores' });
        return;
      }

      // Check if custom backhalf already exists
      const existingUrl = await Url.findOne({ customBackhalf });
      if (existingUrl) {
        res.status(409).json({ error: 'Custom backhalf already in use' });
        return;
      }

      shortCode = customBackhalf;
    } else {
      // Generate unique 6-character short code
      shortCode = nanoid(6);
      
      // Ensure uniqueness
      let existingUrl = await Url.findOne({ shortCode });
      let attempts = 0;
      while (existingUrl && attempts < 10) {
        shortCode = nanoid(6);
        existingUrl = await Url.findOne({ shortCode });
        attempts++;
      }

      if (existingUrl) {
        res.status(500).json({ error: 'Failed to generate unique short code' });
        return;
      }
    }

    // Create new URL document
    const newUrl = await Url.create({
      originalUrl,
      shortCode,
      customBackhalf: customBackhalf || undefined,
    });

    // Cache in Redis
    await redis.setex(`url:${shortCode}`, 3600, JSON.stringify(newUrl.toObject()));

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
