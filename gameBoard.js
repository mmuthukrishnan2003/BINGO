/**
 * gameBoard.js
 * Generates a randomized 5x5 BINGO board using numbers 1-25.
 * Every call produces a fresh, independently shuffled board — never in order.
 */

/**
 * Fisher-Yates shuffle (in place).
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generates a new 5x5 board.
 * Returns:
 *   grid: number[5][5]                 -> grid[row][col] = number
 *   positionOf: Map<number, {row, col}> -> quick lookup of where a number sits
 */
function generateBoard() {
  const numbers = shuffle(Array.from({ length: 25 }, (_, i) => i + 1));

  const grid = [];
  const positionOf = new Map();

  for (let row = 0; row < 5; row++) {
    const rowValues = numbers.slice(row * 5, row * 5 + 5);
    grid.push(rowValues);
    rowValues.forEach((num, col) => positionOf.set(num, { row, col }));
  }

  return { grid, positionOf };
}

module.exports = { generateBoard, shuffle };
