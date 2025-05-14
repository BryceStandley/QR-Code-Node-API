# QR Code API

A secure RESTful API for generating QR codes built with Node.js, Express, and TypeScript. This service accepts authorized POST requests and returns QR code images.

## Features

- Generate QR codes from text or URL data
- API key authentication for secure access
- Customizable QR code options (size, colors, error correction)
- Health check endpoint for monitoring

## Prerequisites

- Node.js (version 18 or higher)
- npm (comes with Node.js)
- Git (optional, for cloning the repository)

## Installation

1. Clone the repository (or download the source code)

```bash
git clone https://github.com/BryceStandley/QR-Code-Node-API.git
cd QR-Code-Node-API
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file in the project root directory

```bash
# Create .env file
touch .env

# Add your API token (replace 'your_secure_token_here' with a strong, random token)
echo "API_TOKEN=your_secure_token_here" > .env

# Add a port to the .env file if you want a different port than the default(3000)
echo "PORT=3000" > .env
```

For production, generate a strong random token:

```bash
# Generate a secure random token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Development

To run the server in development mode:

```bash
# Run with tsx for development
npm install -g tsx  # If not already installed globally
tsx src/app.ts
```

The server will start on port 3000 by default (or the port specified in your environment variables).

## Production Build

To compile TypeScript to JavaScript for production:

```bash
# Build the project
npm run build  # Runs the TypeScript compiler (tsc)

# Run the compiled JavaScript
node dist/app.js
```


## Deployment

### Option 1: Traditional Server Deployment

1. Build the project as described above
2. Transfer the compiled files to your server
3. Install production dependencies 
4. Set up environment variables
5. Use a process manager like PM2 to keep the application running

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start dist/app.js --name "QR-Code-Node-API"

# Configure PM2 to start on system boot
pm2 startup
pm2 save
```

### Option 2: Docker Deployment

1. Build and run the Docker image from the included Dockerfile:

```bash
# Build the Docker image
docker build -t QR-Code-Node-API .

# Run the container
docker run -p 3000:3000 -e API_TOKEN=your_secure_token_here QR-Code-Node-API
```

## Usage

### Generate a QR Code

Send a POST request to `/generate-qr` with your API token:

```bash
curl -X POST \
  http://localhost:3000/generate-qr \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "your_secure_token_here",
    "data": "https://example.com",
    "errorCorrectionLevel": "H",
    "width": 300
  }'
```

The response will be a PNG image of the QR code.

### Additional Parameters

| Parameter           | Description                               | Default   | Options               |
|---------------------|-------------------------------------------|-----------|------------------------|
| data                | The content to encode in the QR code      | (required)| Any string             |
| token               | Your API authentication token             | (required)| Your token             |
| errorCorrectionLevel| Error correction capability               | 'M'       | 'L', 'M', 'Q', 'H'     |
| width               | Width of the QR code in pixels            | 300       | Any positive number    |
| darkColor           | Color of the QR code modules              | '#000000' | Any valid CSS color    |
| lightColor          | Background color of the QR code           | '#FFFFFF' | Any valid CSS color    |

### Health Check

To check if the API is running:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"ok"}
```

## License

[MIT](LICENSE)