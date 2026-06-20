import geoip from 'geoip-lite';

export interface ParsedAnalytics {
  country: string;
  city: string;
  device: string;
  browser: string;
}

export function parseUserAgent(userAgent: string): { device: string; browser: string } {
  const ua = userAgent.toLowerCase();

  // Device detection
  let device = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'Tablet';
  }

  // Browser detection
  let browser = 'Unknown';
  if (ua.includes('chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari')) {
    browser = 'Safari';
  } else if (ua.includes('edge')) {
    browser = 'Edge';
  } else if (ua.includes('opera')) {
    browser = 'Opera';
  }

  return { device, browser };
}

export function getGeoLocation(ip: string): { country: string; city: string } {
  const geo = geoip.lookup(ip);
  if (!geo) {
    return { country: 'Unknown', city: 'Unknown' };
  }
  return {
    country: geo.country || 'Unknown',
    city: geo.city || 'Unknown',
  };
}

export function extractAnalytics(ip: string, userAgent: string): ParsedAnalytics {
  const geo = getGeoLocation(ip);
  const { device, browser } = parseUserAgent(userAgent);

  return {
    country: geo.country,
    city: geo.city,
    device,
    browser,
  };
}
