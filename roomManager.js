/**
 * roomManager.js
 * Handles room lifecycle: creating rooms with shareable codes, joining,
 * quick-match pairing, and lookups. Holds GameRoom instances in memory —
 * swap the Map for Redis if you need multi-instance scaling.
 */

const { GameRoom } = require('./gameEngine');

function generateRoomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

class RoomManager {
  constructor() {
    this.rooms = new Map();       // roomId -> GameRoom
    this.pendingRooms = new Map(); // roomId -> { hostPlayer, isPrivate }
    this.quickMatchQueue = [];     // players waiting for a random opponent
  }

  /**
   * Step 1 of "Create Room": host creates a room and waits for an opponent.
   */
  createRoom(hostPlayer, { isPrivate = true } = {}) {
    let roomId;
    do {
      roomId = generateRoomCode();
    } while (this.pendingRooms.has(roomId) || this.rooms.has(roomId));

    this.pendingRooms.set(roomId, { hostPlayer, isPrivate });
    return { roomId, isPrivate };
  }

  /**
   * Step 2: a second player joins via room code (private) or listing (public).
   * Starts the actual GameRoom once two players are present.
   */
  joinRoom(roomId, joiningPlayer) {
    const pending = this.pendingRooms.get(roomId);
    if (!pending) {
      throw new Error('Room not found or already full.');
    }
    if (pending.hostPlayer.id === joiningPlayer.id) {
      throw new Error('Cannot join your own room as the second player.');
    }

    const room = new GameRoom(roomId, pending.hostPlayer, joiningPlayer);
    this.rooms.set(roomId, room);
    this.pendingRooms.delete(roomId);
    return room;
  }

  listPublicRooms() {
    return Array.from(this.pendingRooms.entries())
      .filter(([, data]) => !data.isPrivate)
      .map(([roomId, data]) => ({ roomId, hostName: data.hostPlayer.name }));
  }

  /**
   * Quick Match: pairs the first two waiting players automatically.
   * Returns a started GameRoom if a match was made, otherwise null
   * (meaning this player is now waiting in queue).
   */
  quickMatch(player) {
    if (this.quickMatchQueue.length > 0) {
      const opponent = this.quickMatchQueue.shift();
      const roomId = generateRoomCode();
      const room = new GameRoom(roomId, opponent, player);
      this.rooms.set(roomId, room);
      return room;
    }
    this.quickMatchQueue.push(player);
    return null;
  }

  cancelQuickMatch(playerId) {
    this.quickMatchQueue = this.quickMatchQueue.filter(p => p.id !== playerId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Finds the active room a given player is currently part of (useful for
   * reconnect-on-disconnect flows).
   */
  findRoomByPlayer(playerId) {
    for (const room of this.rooms.values()) {
      if (room.playerIds.includes(playerId) && room.status === 'in_progress') {
        return room;
      }
    }
    return null;
  }

  removeRoom(roomId) {
    this.rooms.delete(roomId);
  }
}

module.exports = { RoomManager, generateRoomCode };
