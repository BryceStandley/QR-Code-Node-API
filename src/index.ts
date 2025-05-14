// QR Code API for Cloudflare Workers using Hono
// Modified for IBM Cognos Analytics integration - URL parameter-based requests

import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import QRCode from "qrcode-svg";
// Removed unused import

// Define types for your environment variables and bindings
type Bindings = {
  ALLOWED_DOMAINS: string; // Comma-separated list of allowed domains for the referrer check
};

// Create Hono app with bindings type
const app = new Hono<{ Bindings: Bindings }>();

// Apply middleware
app.use('*', secureHeaders());
app.use('*', logger());
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    maxAge: 86400,
}));

// Root endpoint
app.get('/', (c) => {
    return c.text('QR Code Generator API is running. Send a GET request to /qr with data parameter.');
});

// Simple referrer-based security middleware
// This helps restrict access to only your Cognos environment
const referrerCheck = async (c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) => {
    const referrer = c.req.header('Referer') || '';
    const allowedDomains = (c.env.ALLOWED_DOMAINS || '').split(',');

  // Skip check if no allowed domains are configured (development mode)
    if (!c.env.ALLOWED_DOMAINS || allowedDomains.length === 0) {
        console.log('Warning: No allowed domains configured, allowing all requests');
        await next();
        return;
    }

  // Check if the referrer matches any allowed domain
    const isAllowed = allowedDomains.some((domain: string) => 
    domain.trim() && referrer.includes(domain.trim())
    );

    if (!isAllowed) {
        console.log(`Blocked request from referrer: ${referrer}`);
        return c.text('Unauthorized access. This API can only be used from authorized applications.', 403);
    }

    await next();
};

// QR code generation endpoint via URL parameters
// Example: /qr?data=https://example.com&size=300&ecl=H
app.get('/qr', referrerCheck, async (c) => {
    try {
        // Get parameters from URL
        const data = c.req.query('data');
        const size = parseInt(c.req.query('size') || '300');
        const ecl = c.req.query('ecl') || 'M';
        const dark = c.req.query('dark') || '#000000';
        const light = c.req.query('light') || '#FFFFFF';
        
        // Validate required parameters
        if (!data) {
            return c.text('Missing required "data" parameter', 400);
        }
        
        // Validate error correction level
        if (!['L', 'M', 'Q', 'H'].includes(ecl)) {
            return c.text('Invalid error correction level. Use L, M, Q, or H.', 400);
        }
        
        // Validate size
        if (isNaN(size) || size < 50 || size > 1000) {
            return c.text('Invalid size. Must be between 50 and 1000 pixels.', 400);
        }
        
        // Options for the QR code
        const options = {
            content: data,
            ecl: ecl as 'L' | 'M' | 'Q' | 'H',
            padding: 1,
            width: size
        };
        
        // Generate QR code as a data URL string
        //const qrDataUrl = await QRCode.toDataURL(data, options);
        
        // Ensure qrDataUrl is resolved before splitting
        //const base64Data = (await qrDataUrl).split(',')[1];
        
        // Convert base64 to binary
        //const binaryData = Buffer.from(base64Data, 'base64');
        
        const qr = new QRCode(options);
        return new Response(qr.svg(), { headers: { "Content-Type": "image/svg+xml" } });

    // Return the PNG image
    //return new Response(binaryData, {
    //    headers: {
    //        'Content-Type': 'image/jpeg',
    //        'Cache-Control': 'public, max-age=3600'
    //    }
    //});
    
    } catch (error) {
        console.error('Error generating QR code:', error);
        return c.text(`Error generating QR code: ${(error as Error).message}`, 500);
    }
});


// Health check endpoint
app.get('/health', (c) => {
    return c.json({ status: 'ok' });
});

// Export the Hono app for Cloudflare Workers
export default app;