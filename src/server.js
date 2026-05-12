require('dotenv').config();

const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const compression  = require('compression');
const path         = require('path');
const rateLimit    = require('express-rate-limit');
const jwt          = require('jsonwebtoken');

const { errorHandler }      = require('./middleware/errorHandler');
const authRoutes             = require('./routes/auth');
const userRoutes             = require('./routes/users');
const postRoutes             = require('./routes/posts');
const commentRoutes          = require('./routes/comments');
const storyRoutes            = require('./routes/stories');
const messageRoutes          = require('./routes/messages');
const notificationRoutes     = require('./routes/notifications');
const searchRoutes           = require('./routes/search');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000',
          methods: ['GET','POST'], credentials: true },
});
app.set('io', io);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/uploads', express.static(
  path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')
));
app.use(rateLimit({ windowMs: 60000, max: 300,
  message: { error: 'Too many requests.' } }));

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/posts',         postRoutes);
app.use('/api/comments',      commentRoutes);
app.use('/api/stories',       storyRoutes);
app.use('/api/conversations', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search',        searchRoutes);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use(errorHandler);

// Socket.io auth
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required.'));
  try {
    socket.userId = jwt.verify(token, process.env.JWT_SECRET).userId;
    next();
  } catch { next(new Error('Invalid token.')); }
});

const onlineUsers = new Map();
io.on('connection', (socket) => {
  const uid = socket.userId;
  if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set());
  onlineUsers.get(uid).add(socket.id);
  socket.broadcast.emit('user_online', { userId: uid });

  socket.on('join_conversation',  (id) => socket.join(id));
  socket.on('leave_conversation', (id) => socket.leave(id));
  socket.on('typing_start', ({ convId }) =>
    socket.to(convId).emit('typing', { userId: uid, convId, typing: true }));
  socket.on('typing_stop',  ({ convId }) =>
    socket.to(convId).emit('typing', { userId: uid, convId, typing: false }));
  socket.on('message_seen', ({ convId, messageId }) =>
    socket.to(convId).emit('message_seen', { userId: uid, messageId }));

  socket.on('disconnect', () => {
    onlineUsers.get(uid)?.delete(socket.id);
    if (!onlineUsers.get(uid)?.size) {
      onlineUsers.delete(uid);
      socket.broadcast.emit('user_offline', { userId: uid });
    }
  });
});

io.sendNotification = (recipientId, payload) => {
  onlineUsers.get(recipientId)?.forEach((sid) =>
    io.to(sid).emit('notification', payload));
};

if (process.env.NODE_ENV !== 'production') {
  const PORT = parseInt(process.env.PORT || '3000');

  server.listen(PORT, () => {
    console.log('🚀 Photogram API → http://localhost:' + PORT);
    console.log('📡 Socket.io ready');
  });
}

module.exports = app;