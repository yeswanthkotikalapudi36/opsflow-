const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');

const config = require('./config');
const { connectDB } = require('./db');
const { seedDatabase } = require('./seeds/seed');
const { initSocket } = require('./services/socketService');
const apiRoutes = require('./routes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});
initSocket(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Mount REST API
app.use('/api', apiRoutes);

// Serve static frontend build if present (Production deployment mode)
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
    return next();
  }
  const indexFile = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      // In dev mode when client is served by Vite on port 3000
      res.status(200).json({
        message: 'OpsFlow Reliability API is running.',
        clientUrl: config.clientUrl,
        apiDocs: '/api/health',
      });
    }
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'An unexpected error occurred on the server.',
  });
});

// Start Server
async function startServer() {
  try {
    await connectDB();
    await seedDatabase();

    server.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`🚀 OpsFlow Reliability Server live on port: ${config.port}`);
      console.log(`📡 Socket.io Real-Time Engine: ACTIVE`);
      console.log(`🔗 REST API Health Check: http://localhost:${config.port}/api/health`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server };
