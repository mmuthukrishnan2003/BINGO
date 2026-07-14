/**
 * socketHandlers.js
 * Example of wiring gameEngine.js + roomManager.js + chatManager.js into a
 * Socket.IO server. This is the "glue" layer only — plug it into your own
 * Express + Socket.IO bootstrap, auth middleware, etc.
 *
 * Usage in your server entry point:
 *
 *   const { Server } = require('socket.io');
 *   const io = new Server(httpServer, { cors: { origin: '*' } });
 *   registerBingoHandlers(io);
 */

const { RoomManager } = require('./roomManager');
const { ChatManager, SUPPORTED_EMOJIS } = require('./chatManager');

function registerBingoHandlers(io) {
  const roomManager = new RoomManager();
  const chatManager = new ChatManager();

  io.on('connection', (socket) => {
    // Expect your auth middleware to have attached socket.data.user = { id, name }
    const user = socket.data.user || { id: socket.id, name: 'Guest' };

    socket.on('room:create', ({ isPrivate = true } = {}, ack) => {
      const { roomId } = roomManager.createRoom(user, { isPrivate });
      socket.join(roomId);
      ack?.({ roomId });
    });

    socket.on('room:join', ({ roomId }, ack) => {
      try {
        const room = roomManager.joinRoom(roomId, user);
        socket.join(roomId);

        // Send each player their own board privately
        for (const playerId of room.playerIds) {
          io.to(playerId).emit('game:started', room.toClientState(playerId));
        }
        io.to(roomId).emit('room:playerJoined', { playerId: user.id, name: user.name });
        ack?.({ success: true });
      } catch (err) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('room:quickMatch', (_payload, ack) => {
      const room = roomManager.quickMatch(user);
      if (!room) {
        ack?.({ waiting: true });
        return;
      }
      for (const playerId of room.playerIds) {
        io.to(playerId).emit('game:started', room.toClientState(playerId));
      }
      ack?.({ waiting: false, roomId: room.roomId });
    });

    socket.on('game:move', ({ roomId, number }, ack) => {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        ack?.({ success: false, error: 'Room not found.' });
        return;
      }
      try {
        const result = room.makeMove(user.id, number);

        // Broadcast the move + updated state to both players.
        // Each player still only ever receives THEIR OWN board layout,
        // sent once at game:started — from here on we just send the
        // shared called-numbers list + scores, which is enough for each
        // client to re-render its own board locally.
        io.to(roomId).emit('game:moveMade', {
          byPlayerId: user.id,
          number: result.number,
          calledNumbers: result.calledNumbers,
          scores: result.scores,
          nextTurn: result.nextTurn,
        });

        for (const [playerId, lines] of Object.entries(result.newLinesByPlayer)) {
          if (lines.length > 0) {
            io.to(playerId).emit('game:linesCompleted', { lines, newScore: result.scores[playerId] });
          }
        }

        if (result.status === 'finished') {
          io.to(roomId).emit('game:over', { winnerId: result.winnerId, scores: result.scores });
          roomManager.removeRoom(roomId);
        }

        ack?.({ success: true });
      } catch (err) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('chat:send', ({ roomId, message }, ack) => {
      try {
        const entry = chatManager.addMessage(roomId, {
          userId: user.id,
          userName: user.name,
          message,
        });
        io.to(roomId).emit('chat:message', entry);
        ack?.({ success: true });
      } catch (err) {
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on('chat:history', ({ roomId }, ack) => {
      ack?.(chatManager.getHistory(roomId));
    });

    socket.on('emoji:list', (_payload, ack) => {
      ack?.(SUPPORTED_EMOJIS);
    });

    socket.on('disconnect', () => {
      roomManager.cancelQuickMatch(user.id);
      const room = roomManager.findRoomByPlayer(user.id);
      if (room) {
        io.to(room.roomId).emit('room:playerDisconnected', { playerId: user.id });
        // Room is left intact (not removed) so the player can reconnect;
        // add your own timeout/forfeit logic here if desired.
      }
    });
  });
}

module.exports = { registerBingoHandlers };
