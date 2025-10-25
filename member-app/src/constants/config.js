/**
 * Application configuration
 * Environment-specific settings and constants
 */

export const config = {
  // App info
  appName: 'Mahaveer Bhavan',
  appVersion: '1.0.0',
  bundleId: 'com.mahaverbhavan.member',

  // API configuration
  supabase: {
    url: process.env.SUPABASE_URL || 'https://juvrytwhtivezeqrmtpq.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },

  // Feature flags
  features: {
    messaging: true,
    gallery: true,
    donations: true,
    events: true,
    idCard: true,
    qrScanning: true,
  },

  // Pagination
  pagination: {
    eventsPerPage: 20,
    galleryPerPage: 20,
    messagesPerPage: 50,
  },

  // File upload limits
  upload: {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxVideoSize: 50 * 1024 * 1024, // 50MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/jpg'],
    allowedVideoTypes: ['video/mp4', 'video/mov'],
  },

  // Cache duration (milliseconds)
  cache: {
    shortTerm: 5 * 60 * 1000, // 5 minutes
    mediumTerm: 30 * 60 * 1000, // 30 minutes
    longTerm: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Deep linking
  deepLink: {
    scheme: 'mahaverbhavan',
    prefixes: ['mahaverbhavan://'],
  },

  // External links
  links: {
    website: 'https://mahaverbhavan.org',
    support: 'https://mahaverbhavan.org/support',
    privacyPolicy: 'https://mahaverbhavan.org/privacy',
    termsOfService: 'https://mahaverbhavan.org/terms',
  },

  // Contact info
  contact: {
    email: 'support@mahaverbhavan.org',
    phone: '+91 XXXXXXXXXX',
  },
};

export default config;
