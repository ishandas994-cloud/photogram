require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const storyRoutes = require('./routes/stories');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');

// =========================
// App + Server
// =========================
const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);

// =========================
// CORS CONFIG
// =========================
const allowedOrigins = [
  'http://localhost:3000',
  'https://photogram-eta.vercel.app'
];

// =========================
// Socket.IO
// =========================
const Pusher = require('pusher');
const pusher = new Pusher({
  appId:   process.env.PUSHER_APP_ID,
  key:     process.env.PUSHER_KEY,
  secret:  process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS:  true,
});
app.set('pusher', pusher);

// =========================
// MIDDLEWARES
// =========================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

app.use(compression());

app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Static uploads
app.use(
  '/uploads',
  express.static(
    path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')
  )
);

// Rate limit
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: { error: 'Too many requests.' }
  })
);

// =========================
// ROUTES
// =========================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/conversations', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);

// =========================
// HEALTH CHECK
// =========================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// =========================
// ROOT
// =========================
app.get('/', (_req, res) => {
  res.json({ message: 'Photogram Backend Running 🚀' });
});

// =========================
// 404 HANDLER
// =========================
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// =========================
// ERROR HANDLER
// =========================
app.use(errorHandler);

// =========================
// SOCKET AUTH
// =========================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;

    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// =========================
// ONLINE USERS TRACKING
// =========================
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const uid = socket.userId;

  if (!onlineUsers.has(uid)) {
    onlineUsers.set(uid, new Set());
  }

  onlineUsers.get(uid).add(socket.id);

  socket.broadcast.emit('user_online', { userId: uid });

  // join chat
  socket.on('join_conversation', (id) => socket.join(id));
  socket.on('leave_conversation', (id) => socket.leave(id));

  // typing
  socket.on('typing_start', ({ convId }) => {
    socket.to(convId).emit('typing', {
      userId: uid,
      convId,
      typing: true
    });
  });

  socket.on('typing_stop', ({ convId }) => {
    socket.to(convId).emit('typing', {
      userId: uid,
      convId,
      typing: false
    });
  });

  socket.on('message_seen', ({ convId, messageId }) => {
    socket.to(convId).emit('message_seen', {
      userId: uid,
      messageId
    });
  });

  // disconnect
  socket.on('disconnect', () => {
    onlineUsers.get(uid)?.delete(socket.id);

    if (!onlineUsers.get(uid)?.size) {
      onlineUsers.delete(uid);
      socket.broadcast.emit('user_offline', { userId: uid });
    }
  });
});

// =========================
// NOTIFICATION HELPER
// =========================
io.sendNotification = (recipientId, payload) => {
  onlineUsers.get(recipientId)?.forEach((sid) => {
    io.to(sid).emit('notification', payload);
  });
};

// =========================
// START SERVER (IMPORTANT FOR RENDER)
// =========================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Photogram API running on port ${PORT}`);
  console.log(`📡 Socket.IO ready`);
});

module.exports = app;