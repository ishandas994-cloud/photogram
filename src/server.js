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
const Pusher = require('pusher');

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
// APP
// =========================
const app = express();

app.set('trust proxy', 1);

// =========================
// SERVER
// =========================
const server = http.createServer(app);

// =========================
// ALLOWED ORIGINS
// =========================
const allowedOrigins = [
  'http://localhost:3000',
  'https://photogram-eta.vercel.app'
];

// =========================
// SOCKET.IO
// =========================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

// =========================
// PUSHER
// =========================
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || 'ap2',
  useTLS: true
});

app.set('pusher', pusher);

// =========================
// MIDDLEWARES
// =========================
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
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
  morgan(
    process.env.NODE_ENV === 'production'
      ? 'combined'
      : 'dev'
  )
);

app.use(express.json({ limit: '10mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

// =========================
// STATIC FILES
// =========================
app.use(
  '/uploads',
  express.static(
    path.join(__dirname, '..', 'uploads')
  )
);

// =========================
// RATE LIMIT
// =========================
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: {
      error: 'Too many requests'
    }
  })
);

// =========================
// AUTH MIDDLEWARE
// =========================
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(401)
        .json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res
        .status(401)
        .json({ error: 'Invalid token format' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: 'Invalid token' });
  }
};

// =========================
// PUSHER AUTH
// =========================
app.post(
  '/api/pusher/auth',
  requireAuth,
  (req, res) => {
    try {
      const socketId = req.body?.socket_id;
      const channel = req.body?.channel_name;

      if (!socketId || !channel) {
        return res.status(400).json({
          error: 'socket_id and channel_name required'
        });
      }

      const auth = pusher.authorizeChannel(
        socketId,
        channel,
        {
          user_id: req.user.userId,
          user_info: {
            username:
              req.user.username || 'user'
          }
        }
      );

      res.send(auth);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: 'Pusher auth failed'
      });
    }
  }
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
// ROOT ROUTE
// =========================
app.get('/', (_req, res) => {
  res.json({
    message: 'Photogram Backend Running 🚀'
  });
});

// =========================
// HEALTH
// =========================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// =========================
// SOCKET AUTH
// =========================
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token;

    if (!token) {
      return next(
        new Error('Authentication required')
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.userId = decoded.userId;

    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// =========================
// ONLINE USERS
// =========================
const onlineUsers = new Map();

// =========================
// SOCKET EVENTS
// =========================
io.on('connection', (socket) => {
  const uid = socket.userId;

  if (!onlineUsers.has(uid)) {
    onlineUsers.set(uid, new Set());
  }

  onlineUsers.get(uid).add(socket.id);

  socket.broadcast.emit('user_online', {
    userId: uid
  });

  socket.on('join_conversation', (id) => {
    socket.join(id);
  });

  socket.on('leave_conversation', (id) => {
    socket.leave(id);
  });

  socket.on(
    'typing_start',
    ({ convId }) => {
      socket.to(convId).emit('typing', {
        userId: uid,
        convId,
        typing: true
      });
    }
  );

  socket.on(
    'typing_stop',
    ({ convId }) => {
      socket.to(convId).emit('typing', {
        userId: uid,
        convId,
        typing: false
      });
    }
  );

  socket.on(
    'message_seen',
    ({ convId, messageId }) => {
      socket.to(convId).emit(
        'message_seen',
        {
          userId: uid,
          messageId
        }
      );
    }
  );

  socket.on('disconnect', () => {
    onlineUsers.get(uid)?.delete(
      socket.id
    );

    if (!onlineUsers.get(uid)?.size) {
      onlineUsers.delete(uid);

      socket.broadcast.emit(
        'user_offline',
        {
          userId: uid
        }
      );
    }
  });
});

// =========================
// SEND NOTIFICATION
// =========================
io.sendNotification = (
  recipientId,
  payload
) => {
  onlineUsers
    .get(recipientId)
    ?.forEach((sid) => {
      io.to(sid).emit(
        'notification',
        payload
      );
    });
};

// =========================
// 404
// =========================
app.use((_req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// =========================
// ERROR HANDLER
// =========================
app.use(errorHandler);

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );

  console.log('📡 Socket.IO active');
});

module.exports = app;