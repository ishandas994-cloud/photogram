require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const storyRoutes = require('./routes/stories');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');

const Pusher = require('pusher');

const app = express();
app.set('trust proxy', 1);

const server = http.createServer(app);

// =========================
// Allowed Origins
// =========================
const allowedOrigins = [
  'http://localhost:3000',
  'https://photogram-eta.vercel.app'
];

// =========================
// Socket.IO
// ⚠️ MUST keep for dev + Render
// =========================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

app.set('io', io);

// =========================
// Pusher (REAL-TIME backup)
// =========================
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'ap2',
  useTLS: true,
});

app.set('pusher', pusher);

// =========================
// Pusher Auth Route (IMPORTANT)
// =========================
const requireAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/pusher/auth', requireAuth, (req, res) => {
  const socketId = req.body.socket_id;
  const channel = req.body.channel_name;

  const auth = pusher.authorizeChannel(socketId, channel, {
    user_id: req.user.userId,
    user_info: {
      username: req.user.username || 'user'
    }
  });

  res.send(auth);
});

// =========================
// Middlewares
// =========================
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(compression());
app.use(morgan('dev'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 300
}));

// =========================
// Routes
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
// Health
// =========================
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// =========================
// Socket Auth
// =========================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;

    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// =========================
// Socket Events
// =========================
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const uid = socket.userId;

  if (!onlineUsers.has(uid)) {
    onlineUsers.set(uid, new Set());
  }

  onlineUsers.get(uid).add(socket.id);

  socket.on('disconnect', () => {
    onlineUsers.get(uid)?.delete(socket.id);
  });
});

// =========================
// Server start
// =========================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
  console.log(`📡 Socket.IO active`);
});

module.exports = app;