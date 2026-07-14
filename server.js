/**
 * server.js
 * Entry point for the BINGO backend. Deploy this to Render / Railway / Fly.io
 * — any host that runs a long-lived Node process (NOT Netlify Functions,
 * which are stateless and short-lived and can't hold Socket.IO connections
 * or in-memory game state).
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { registerBingoHandlers } = require('./socketHandlers');

const app = express();
const server = http.createServer(app);

// Set this to your Netlify site URL once deployed, e.g.
// https://your-bingo-site.netlify.app
// Using '*' works for quick testing but tighten it before going live.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Simple health check — useful for confirming the host deployed correctly.
app.get('/', (req, res) => {
  res.send('Bingo backend is running.');
});

// TEMPORARY auth stand-in: assigns each socket a guest identity.
// Replace this with real JWT/session verification when you add auth.
io.use((socket, next) => {
  const name = socket.handshake.auth?.name || `Guest-${socket.id.slice(0, 4)}`;
  socket.data.user = { id: socket.id, name };
  next();
});

registerBingoHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Bingo backend listening on port ${PORT}`);
});
