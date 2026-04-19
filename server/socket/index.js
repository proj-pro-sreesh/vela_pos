const jwt = require('jsonwebtoken');
const User = require('../models/User');

const initializeSocket = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('No token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.user = user;
      next();
    } catch (error) {
      // Return specific message for token validation errors
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(new Error('Token is not valid'));
      }
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    // Join room based on role
    socket.join(`role:${socket.user.role}`);

    // Handle table update from any client
    socket.on('table:status-change', async (data) => {
      socket.broadcast.emit('table:update', data);
    });

    // Handle order update
    socket.on('order:update', async (data) => {
      socket.broadcast.emit('order:updated', data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
    });
  });

  return io;
};

module.exports = initializeSocket;
