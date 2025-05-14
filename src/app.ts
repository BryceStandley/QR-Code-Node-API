// QR Code Generator API with Token Authentication
// TypeScript implementation of a secure Express.js API that generates QR codes from authorized POST requests

import express, { Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get API token from environment variable (with fallback for development)
const API_TOKEN = process.env.API_TOKEN || 'development_token_change_me';

// Define interfaces for request body and QR code options
interface QRCodeRequestBody {
  data: string;
  token: string; // Authentication token
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  darkColor?: string;
  lightColor?: string;
  width?: number;
}

interface QRCodeOptions {
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  type: 'png';
  quality: number;
  margin: number;
  color: {
    dark: string;
    light: string;
  };
  width: number;
}

// Authentication middleware
const authenticateRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Check for token in request body
  const requestBody = req.body as Partial<QRCodeRequestBody>;
  const token = requestBody.token;
  
  // Token validation
  if (!token || token !== API_TOKEN) {
    res.status(401).json({ error: 'Unauthorized. Invalid or missing authentication token.' });
    return;
  }
  
  next();
};

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Root endpoint
app.get('/', (_req: Request, res: Response): void => {
  res.send('QR Code Generator API is running. Authorized POST requests to /generate-qr are required.');
});

// QR code generation endpoint with authentication middleware
app.post('/generate-qr', authenticateRequest, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the data from the request body
    const requestBody = req.body as QRCodeRequestBody;
    const data = requestBody.data;
    
    if (!data) {
      res.status(400).json({ error: 'No data provided. Please include "data" in your JSON body.' });
      return;
    }
    
    // Options for the QR code
    const options: QRCodeOptions = {
      errorCorrectionLevel: requestBody.errorCorrectionLevel || 'M', // L, M, Q, H
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: requestBody.darkColor || '#000000',
        light: requestBody.lightColor || '#ffffff'
      },
      width: requestBody.width || 300
    };
    
    // Generate QR code as buffer
    const qrBuffer = await QRCode.toBuffer(String(data), options);
    
    // Set response headers
    res.type('png');
    res.send(qrBuffer);
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate QR code', details: errorMessage });
  }
});

// Health check endpoint (no authentication required)
app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
app.listen(port, (): void => {
  if (!process.env.API_TOKEN) {
    console.warn('⚠️  WARNING: Running with default API token. Set API_TOKEN environment variable in production.');
  }
  console.log(`QR Code Generator API running on port ${port}`);
});