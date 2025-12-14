// Vercel Serverless Function wrapper for Express server
// This file imports the Express app from server/index.js and exports it for Vercel

import app from '../server/index.js';

// Export as Vercel serverless function
// Vercel will automatically handle Express apps exported from /api routes
export default app;
