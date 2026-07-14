/**
 * gameEngine.js
 * Core BINGO rules engine — framework agnostic (no Socket.IO / Express here).
 * Drop this into any Node backend and wire it up to your transport layer
 * (see socketHandlers.js for a Socket.IO example).
 *
 * Rules implemented:
 *  - Each player gets their own independently shuffled 5x5 board (1-25).
 *  - There is one shared "called numbers" pool per game (classic bingo:
 *    calling a number crosses it on every board where it appears).
 *  - Players alternate turns. A move is only valid on your turn and only
 *    for a number that hasn't been called yet.
 *  - 12 possible lines per board: 5 rows, 5 columns, 2 diagonals.
 *  - Each line scores 1 point, exactly once, the moment it's completed.
 *  - First player to reach 5 points wins immediately.
 */

const { generateBoard } = require('./gameBoard');

// Line definitions are positional (row/col indices), so they're identical
// for every board regardless of how the numbers were shuffled.
function buildLineDefinitions() {
  const lines = [];

  // 5 horizontal lines
  for (let row = 0; row < 5; row++) {
    lines.push({ id: `row-${row}`, type: 'horizontal', cells: [0, 1, 2, 3, 4].map(col => [row, col]) });
  }

  // 5 vertical lines
  for (let col = 0; col < 5; col++) {
    lines.push({ id: `col-${col}`, type: 'vertical', cells: [0, 1, 2, 3, 4].map(row => [row, col]) });
  }

  // 2 diagonals
  lines.push({ id: 'diag-main', type: 'diagonal', cells: [0, 1, 2, 3, 4].map(i => [i, i]) });
  lines.push({ id: 'diag-anti', type: 'diagonal', cells: [0, 1, 2, 3, 4].map(i => [i, 4 - i]) });

  return lines; // length === 12
}

const LINE_DEFINITIONS = buildLineDefinitions();
const WINNING_SCORE = 5;

class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    const { grid, positionOf } = generateBoard();
    this.grid = grid;
    this.positionOf = positionOf;
    this.score = 0;
    this.completedLines = new Set(); // line ids already scored for this player
  }

  isCellCrossed(row, col, calledNumbers) {
    return calledNumbers.has(this.grid[row][col]);
  }

  /**
   * Re-checks all 12 lines against the current called-numbers set.
   * Returns the list of NEWLY completed lines (not previously scored),
   * and updates this.score / this.completedLines in place.
   */
  evaluateNewLines(calledNumbers) {
    const newlyCompleted = [];

    for (const line of LINE_DEFINITIONS) {
      if (this.completedLines.has(line.id)) continue; // already scored

      const complete = line.cells.every(([row, col]) => this.isCellCrossed(row, col, calledNumbers));
      if (complete) {
        this.completedLines.add(line.id);
        this.score += 1;
        newlyCompleted.push({ id: line.id, type: line.type });
      }
    }

    return newlyCompleted;
  }
}

class GameRoom {
  /**
   * @param {string} roomId
   * @param {{id:string,name:string}} playerA
   * @param {{id:string,name:string}} playerB
   */
  constructor(roomId, playerA, playerB) {
    this.roomId = roomId;
    this.players = {
      [playerA.id]: new Player(playerA.id, playerA.name),
      [playerB.id]: new Player(playerB.id, playerB.name),
    };
    this.playerIds = [playerA.id, playerB.id];
    this.calledNumbers = new Set();
    this.moveHistory = []; // { playerId, number, timestamp }
    this.currentTurn = this.playerIds[Math.round(Math.random())]; // random start
    this.status = 'in_progress'; // 'in_progress' | 'finished'
    this.winnerId = null;
    this.startedAt = new Date();
    this.endedAt = null;
  }

  getOpponentId(playerId) {
    return this.playerIds.find(id => id !== playerId);
  }

  /**
   * Attempts to play a number for the given player.
   * Throws a descriptive Error on any invalid move — catch this at your
   * transport layer (see socketHandlers.js) and emit an error event.
   */
  makeMove(playerId, number) {
    if (this.status !== 'in_progress') {
      throw new Error('Game has already ended.');
    }
    if (!this.players[playerId]) {
      throw new Error('Player is not part of this game.');
    }
    if (this.currentTurn !== playerId) {
      throw new Error('Not your turn.');
    }
    if (!Number.isInteger(number) || number < 1 || number > 25) {
      throw new Error('Number must be an integer between 1 and 25.');
    }
    if (this.calledNumbers.has(number)) {
      throw new Error('That number has already been called.');
    }

    // 1. Call the number (crosses it on both boards wherever it appears)
    this.calledNumbers.add(number);
    this.moveHistory.push({ playerId, number, timestamp: new Date() });

    // 2. Re-evaluate lines for both players
    const results = {};
    for (const id of this.playerIds) {
      results[id] = this.players[id].evaluateNewLines(this.calledNumbers);
    }

    // 3. Check for a winner (mover's new lines are checked first, but either
    //    player could theoretically cross the threshold since numbers are shared)
    let winnerId = null;
    for (const id of this.playerIds) {
      if (this.players[id].score >= WINNING_SCORE) {
        winnerId = id;
        break;
      }
    }

    if (winnerId) {
      this.status = 'finished';
      this.winnerId = winnerId;
      this.endedAt = new Date();
    } else {
      // 4. Advance the turn
      this.currentTurn = this.getOpponentId(playerId);
    }

    return {
      number,
      calledNumbers: Array.from(this.calledNumbers),
      newLinesByPlayer: results,
      scores: this.getScores(),
      nextTurn: this.status === 'in_progress' ? this.currentTurn : null,
      status: this.status,
      winnerId: this.winnerId,
    };
  }

  getScores() {
    const scores = {};
    for (const id of this.playerIds) scores[id] = this.players[id].score;
    return scores;
  }

  /**
   * Serializes room state for sending to clients. Pass `forPlayerId` to
   * include that player's own board (never send an opponent's board layout).
   */
  toClientState(forPlayerId) {
    const player = this.players[forPlayerId];
    return {
      roomId: this.roomId,
      yourBoard: player ? player.grid : null,
      yourScore: player ? player.score : null,
      opponentScore: player ? this.players[this.getOpponentId(forPlayerId)].score : null,
      calledNumbers: Array.from(this.calledNumbers),
      currentTurn: this.currentTurn,
      status: this.status,
      winnerId: this.winnerId,
    };
  }
}

module.exports = { GameRoom, Player, LINE_DEFINITIONS, WINNING_SCORE };
