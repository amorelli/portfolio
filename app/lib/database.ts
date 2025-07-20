import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'grid.db');

// Initialize database connection
export const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create the grid_squares table if it doesn't exist
export function initializeDatabase() {
  const createTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS grid_squares (
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      color TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (x, y)
    )
  `);

  createTable.run();

  // Create an index for faster queries
  const createIndex = db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_grid_coordinates ON grid_squares(x, y)
  `);

  createIndex.run();
}

// Grid square type definition
export interface GridSquare {
  x: number;
  y: number;
  color: string;
  updated_at?: string;
}

// Initialize the database when this module is imported
initializeDatabase();

// Database operations - created after initialization
export const gridOperations = {
  // Get all grid squares
  getAllSquares: db.prepare(`
    SELECT x, y, color, updated_at FROM grid_squares ORDER BY x, y
  `),

  // Get a specific square
  getSquare: db.prepare(`
    SELECT x, y, color, updated_at FROM grid_squares WHERE x = ? AND y = ?
  `),

  // Insert or update a square (UPSERT)
  updateSquare: db.prepare(`
    INSERT INTO grid_squares (x, y, color, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(x, y) DO UPDATE SET
      color = excluded.color,
      updated_at = CURRENT_TIMESTAMP
  `),

  // Delete a specific square
  deleteSquare: db.prepare(`
    DELETE FROM grid_squares WHERE x = ? AND y = ?
  `),

  // Clear all squares
  clearAllSquares: db.prepare(`
    DELETE FROM grid_squares
  `),

  // Get squares count
  getSquareCount: db.prepare(`
    SELECT COUNT(*) as count FROM grid_squares
  `)
};

// Graceful shutdown
process.on('exit', () => db.close());
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});