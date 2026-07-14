/**
 * chatManager.js
 * Lightweight in-memory chat log per room. Swap the Map for a `chats` table
 * (see schema note in README.md) if you want persistent chat history.
 */

const MAX_MESSAGE_LENGTH = 300;

const SUPPORTED_EMOJIS = [
  '😀', '😂', '😍', '😎', '👍', '❤️', '🎉', '😢', '🤣', '😡', '😁', '😭', '🔥', '👏',
];

class ChatManager {
  constructor() {
    this.roomMessages = new Map(); // roomId -> array of messages
  }

  _ensureRoom(roomId) {
    if (!this.roomMessages.has(roomId)) {
      this.roomMessages.set(roomId, []);
    }
    return this.roomMessages.get(roomId);
  }

  /**
   * Adds a chat message. Basic sanitization: trims, enforces max length.
   * (Run any additional profanity/XSS filtering you need before this call
   * or extend this method.)
   */
  addMessage(roomId, { userId, userName, message }) {
    const trimmed = (message || '').trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty.');
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds ${MAX_MESSAGE_LENGTH} characters.`);
    }

    const entry = {
      userId,
      userName,
      message: trimmed,
      timestamp: new Date().toISOString(),
    };

    this._ensureRoom(roomId).push(entry);
    return entry;
  }

  getHistory(roomId) {
    return this._ensureRoom(roomId).slice(); // return a copy
  }

  clearRoom(roomId) {
    this.roomMessages.delete(roomId);
  }
}

module.exports = { ChatManager, SUPPORTED_EMOJIS, MAX_MESSAGE_LENGTH };
