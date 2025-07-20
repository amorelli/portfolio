import { sql, createClient } from '@vercel/postgres';

// Grid square type definition
export interface GridSquare {
  x: number;
  y: number;
  color: string;
  updated_at?: string;
}

// Database client - uses pooled connection if available, otherwise creates client
function getDbClient() {
  // Check if we have a pooled connection string
  if (process.env.POSTGRES_URL && !process.env.POSTGRES_URL.includes('your_vercel_postgres_connection_string_here')) {
    return sql;
  }
  
  // Use direct connection with createClient
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes('your_vercel_postgres')) {
    throw new Error('Please set up your database connection string in .env.local');
  }
  
  const client = createClient({ connectionString });
  return client.sql;
}

// Database initialization - creates table if it doesn't exist
export async function initializeDatabase() {
  try {
    const db = getDbClient();
    
    // Create the grid_squares table if it doesn't exist
    await db`
      CREATE TABLE IF NOT EXISTS grid_squares (
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        color TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (x, y)
      )
    `;

    // Create an index for faster queries
    await db`
      CREATE INDEX IF NOT EXISTS idx_grid_coordinates ON grid_squares(x, y)
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Database operations - all async with PostgreSQL
export const gridOperations = {
  // Get all grid squares
  getAllSquares: async (): Promise<GridSquare[]> => {
    try {
      const db = getDbClient();
      const result = await db`
        SELECT x, y, color, updated_at FROM grid_squares ORDER BY x, y
      `;
      return result.rows as GridSquare[];
    } catch (error) {
      console.error('Error getting all squares:', error);
      throw error;
    }
  },

  // Get a specific square
  getSquare: async (x: number, y: number): Promise<GridSquare | null> => {
    try {
      const db = getDbClient();
      const result = await db`
        SELECT x, y, color, updated_at FROM grid_squares WHERE x = ${x} AND y = ${y}
      `;
      return result.rows[0] as GridSquare || null;
    } catch (error) {
      console.error('Error getting square:', error);
      throw error;
    }
  },

  // Insert or update a square (UPSERT)
  updateSquare: async (x: number, y: number, color: string): Promise<GridSquare> => {
    try {
      const db = getDbClient();
      const result = await db`
        INSERT INTO grid_squares (x, y, color, updated_at)
        VALUES (${x}, ${y}, ${color}, NOW())
        ON CONFLICT(x, y) DO UPDATE SET
          color = EXCLUDED.color,
          updated_at = NOW()
        RETURNING x, y, color, updated_at
      `;
      return result.rows[0] as GridSquare;
    } catch (error) {
      console.error('Error updating square:', error);
      throw error;
    }
  },

  // Delete a specific square
  deleteSquare: async (x: number, y: number): Promise<boolean> => {
    try {
      const db = getDbClient();
      const result = await db`
        DELETE FROM grid_squares WHERE x = ${x} AND y = ${y}
      `;
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting square:', error);
      throw error;
    }
  },

  // Clear all squares
  clearAllSquares: async (): Promise<number> => {
    try {
      const db = getDbClient();
      const result = await db`
        DELETE FROM grid_squares
      `;
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error clearing all squares:', error);
      throw error;
    }
  },

  // Get squares count
  getSquareCount: async (): Promise<number> => {
    try {
      const db = getDbClient();
      const result = await db`
        SELECT COUNT(*) as count FROM grid_squares
      `;
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting square count:', error);
      throw error;
    }
  }
};

// Initialize database when module is imported
// Note: This will only run when the first API call is made
export async function ensureInitialized() {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Don't throw here to allow the app to start, but log the error
  }
}