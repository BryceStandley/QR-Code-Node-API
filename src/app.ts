// QR Code Generator API with Token Authentication
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

const __dirname = path.resolve();

// Load environment variables
dotenv.config();

// Ensure log directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'DD-MM-YYYY HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'qr-code-api' },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

// If we're not in production, also log to the console with colorization
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Morgan token for request body, excluding sensitive data
morgan.token('body', (req: Request) => {
  const body = { ...req.body };
  
  // Remove sensitive information
  if (body.token) body.token = '[REDACTED]';
  
  return JSON.stringify(body);
});

// custom Morgan format
const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :body';


// Basic global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  message: { error: 'Too many requests, please try again later.' }
});

// Get API token from environment variable (with fallback for development)
const API_TOKEN = process.env.API_TOKEN || 'this_is_a_dev_token';

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
    logger.warn(`Authentication failure from IP: ${req.ip}`);
    res.status(401).json({ error: 'Unauthorized. Invalid or missing authentication token.' });
    return;
  }
  
  next();
};

const app = express();
const port = process.env.PORT || 3000;

// for Morgan to write to Winston
const morganStream = {
  write: (message: string) => {
    // Remove newline characters from Morgan output
    logger.info(message.trim());
  }
};

// Setup Morgan middleware
app.use(morgan(morganFormat, { stream: morganStream }));

// Error handling middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error(`Unhandled error: ${err.stack}`);
  res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong' });
};

// Middleware to limit the number of requests
// to the API to prevent abuse
app.use(limiter);

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Root endpoint
app.get('/', (_req: Request, res: Response): void => {
  res.send('QR Code Generator API is running. Authorized POST requests to /generate-qr are required.');
});

// Rate limiter for QR code generation endpoint
const qrLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 requests per 5 minutes
  message: { error: 'QR code generation limit reached. Please try again later.' }
});

// QR code generation endpoint with authentication middleware
app.post('/generate-qr', qrLimiter, authenticateRequest, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get the data from the request body
    const requestBody = req.body as QRCodeRequestBody;
    const data = requestBody.data;
    
    if (!data) {
      res.status(400).json({ error: 'No data provided. Please include "data" in your JSON body.' });
      return;
    }
    
    // Log successful request
    logger.info(`Generating QR code for data with ${data.length} characters`);

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
    
    logger.info('QR code generated successfully');
    // Set response headers
    res.type('png');
    res.send(qrBuffer);
    
  } catch (error) {
    // Log the error
    next(error);
    //const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    //res.status(500).json({ error: 'Failed to generate QR code', details: errorMessage });
  }
});

// Health check endpoint (no authentication required)
app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok' });
});

// Apply the error handling middleware last
app.use(errorHandler);

// Start the server
app.listen(port, (): void => {
  if (!process.env.API_TOKEN) {
    logger.warn('Running with default API token. Set API_TOKEN environment variable in production.');
  }
  logger.info(`QR Code Generator API running on port ${port}`);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught Exception: ${error.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});