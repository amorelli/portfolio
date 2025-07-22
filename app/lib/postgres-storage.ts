import { neon } from '@neondatabase/serverless';

// Grid square type definition (keeping same interface)
export interface GridSquare {
  x: number;
  y: number;
  color: string;
  updated_at?: string;
}

// Letter position type definition
export interface LetterPosition {
  id: string; // unique identifier for each letter/symbol
  character: string; // the letter or symbol
  x: number; // x position on canvas
  y: number; // y position on canvas
  updated_at?: string;
}

// Constants
const GRID_SIZE = 20;

// Database connection
let sql: ReturnType<typeof neon> | null = null;

function getDatabase() {
  if (!sql) {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required');
    }
    sql = neon(databaseUrl);
  }
  return sql;
}

// Database initialization
async function initializeDatabase() {
  const sql = getDatabase();
  
  // Create the grid_squares table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS grid_squares (
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      color TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (x, y)
    )
  `;
  
  // Create the letter_positions table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS letter_positions (
      id TEXT PRIMARY KEY,
      character TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  
  // Create index for better query performance
  await sql`
    CREATE INDEX IF NOT EXISTS idx_grid_coordinates
    ON grid_squares(x, y)
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_letter_positions
    ON letter_positions(character)
  `;
  
  console.log('PostgreSQL database initialized successfully');
}

// PostgreSQL storage operations
class GridPostgresStorage {
  private initializePromise: Promise<void> | null = null;

  // Ensure database is initialized (singleton pattern)
  private async ensureInitialized() {
    if (!this.initializePromise) {
      this.initializePromise = initializeDatabase();
    }
    await this.initializePromise;
  }

  // Public API methods (matching the original interface)
  async getAllSquares(): Promise<GridSquare[]> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const squares = await sql`
        SELECT x, y, color, updated_at
        FROM grid_squares
        ORDER BY x, y
      `;
      
      return (squares as any[]).map(square => ({
        x: square.x,
        y: square.y,
        color: square.color,
        updated_at: square.updated_at?.toISOString()
      }));
    } catch (error) {
      console.error('Error getting all squares:', error);
      throw error;
    }
  }

  async getSquare(x: number, y: number): Promise<GridSquare | null> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const result = await sql`
        SELECT x, y, color, updated_at
        FROM grid_squares
        WHERE x = ${x} AND y = ${y}
      `;
      
      const resultArray = result as any[];
      if (resultArray.length === 0) {
        return null;
      }
      
      const square = resultArray[0];
      return {
        x: square.x,
        y: square.y,
        color: square.color,
        updated_at: square.updated_at?.toISOString()
      };
    } catch (error) {
      console.error('Error getting square:', error);
      throw error;
    }
  }

  async updateSquare(x: number, y: number, color: string): Promise<GridSquare> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const timestamp = new Date();
      
      // Use UPSERT (INSERT ... ON CONFLICT) to insert or update
      const result = await sql`
        INSERT INTO grid_squares (x, y, color, updated_at)
        VALUES (${x}, ${y}, ${color}, ${timestamp})
        ON CONFLICT (x, y)
        DO UPDATE SET 
          color = EXCLUDED.color,
          updated_at = EXCLUDED.updated_at
        RETURNING x, y, color, updated_at
      `;
      
      const updatedSquare = result[0];
      return {
        x: updatedSquare.x,
        y: updatedSquare.y,
        color: updatedSquare.color,
        updated_at: updatedSquare.updated_at?.toISOString()
      };
    } catch (error) {
      console.error('Error updating square:', error);
      throw error;
    }
  }

  async deleteSquare(x: number, y: number): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const result = await sql`
        DELETE FROM grid_squares
        WHERE x = ${x} AND y = ${y}
      `;
      
      return (result as any).count > 0;
    } catch (error) {
      console.error('Error deleting square:', error);
      throw error;
    }
  }

  async clearAllSquares(): Promise<number> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const result = await sql`
        DELETE FROM grid_squares
      `;
      
      return (result as any).count || 0;
    } catch (error) {
      console.error('Error clearing all squares:', error);
      throw error;
    }
  }

  async getSquareCount(): Promise<number> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const result = await sql`
        SELECT COUNT(*) as count
        FROM grid_squares
      `;
      
      return parseInt(result[0].count as string, 10);
    } catch (error) {
      console.error('Error getting square count:', error);
      throw error;
    }
  }
}

// Letter positions storage operations
class LetterPostgresStorage {
  private initializePromise: Promise<void> | null = null;

  // Ensure database is initialized (singleton pattern)
  private async ensureInitialized() {
    if (!this.initializePromise) {
      this.initializePromise = initializeDatabase();
    }
    await this.initializePromise;
  }

  async getAllLetters(): Promise<LetterPosition[]> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const letters = await sql`
        SELECT id, character, x, y, updated_at
        FROM letter_positions
        ORDER BY character, id
      `;
      
      return (letters as any[]).map(letter => ({
        id: letter.id,
        character: letter.character,
        x: letter.x,
        y: letter.y,
        updated_at: letter.updated_at?.toISOString()
      }));
    } catch (error) {
      console.error('Error getting all letters:', error);
      throw error;
    }
  }

  async getLetter(id: string): Promise<LetterPosition | null> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const result = await sql`
        SELECT id, character, x, y, updated_at
        FROM letter_positions
        WHERE id = ${id}
      `;
      
      const resultArray = result as any[];
      if (resultArray.length === 0) {
        return null;
      }
      
      const letter = resultArray[0];
      return {
        id: letter.id,
        character: letter.character,
        x: letter.x,
        y: letter.y,
        updated_at: letter.updated_at?.toISOString()
      };
    } catch (error) {
      console.error('Error getting letter:', error);
      throw error;
    }
  }

  async updateLetterPosition(id: string, character: string, x: number, y: number): Promise<LetterPosition> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const timestamp = new Date();
      
      // Use UPSERT (INSERT ... ON CONFLICT) to insert or update
      const result = await sql`
        INSERT INTO letter_positions (id, character, x, y, updated_at)
        VALUES (${id}, ${character}, ${x}, ${y}, ${timestamp})
        ON CONFLICT (id)
        DO UPDATE SET
          character = EXCLUDED.character,
          x = EXCLUDED.x,
          y = EXCLUDED.y,
          updated_at = EXCLUDED.updated_at
        RETURNING id, character, x, y, updated_at
      `;
      
      const updatedLetter = result[0];
      return {
        id: updatedLetter.id,
        character: updatedLetter.character,
        x: updatedLetter.x,
        y: updatedLetter.y,
        updated_at: updatedLetter.updated_at?.toISOString()
      };
    } catch (error) {
      console.error('Error updating letter position:', error);
      throw error;
    }
  }

  async deleteLetter(id: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const result = await sql`
        DELETE FROM letter_positions
        WHERE id = ${id}
      `;
      
      return (result as any).count > 0;
    } catch (error) {
      console.error('Error deleting letter:', error);
      throw error;
    }
  }

  async clearAllLetters(): Promise<number> {
    try {
      await this.ensureInitialized();
      const sql = getDatabase();
      
      const result = await sql`
        DELETE FROM letter_positions
      `;
      
      return (result as any).count || 0;
    } catch (error) {
      console.error('Error clearing all letters:', error);
      throw error;
    }
  }
}

// Create and export singleton instances
const gridPostgresStorage = new GridPostgresStorage();
const letterPostgresStorage = new LetterPostgresStorage();

// Export the operations interfaces
export const gridOperations = {
  getAllSquares: () => gridPostgresStorage.getAllSquares(),
  getSquare: (x: number, y: number) => gridPostgresStorage.getSquare(x, y),
  updateSquare: (x: number, y: number, color: string) => gridPostgresStorage.updateSquare(x, y, color),
  deleteSquare: (x: number, y: number) => gridPostgresStorage.deleteSquare(x, y),
  clearAllSquares: () => gridPostgresStorage.clearAllSquares(),
  getSquareCount: () => gridPostgresStorage.getSquareCount()
};

export const letterOperations = {
  getAllLetters: () => letterPostgresStorage.getAllLetters(),
  getLetter: (id: string) => letterPostgresStorage.getLetter(id),
  updateLetterPosition: (id: string, character: string, x: number, y: number) => letterPostgresStorage.updateLetterPosition(id, character, x, y),
  deleteLetter: (id: string) => letterPostgresStorage.deleteLetter(id),
  clearAllLetters: () => letterPostgresStorage.clearAllLetters()
};

// Export initialization function to maintain API compatibility
export async function ensureInitialized() {
  // Initialize both storage systems
  await letterPostgresStorage.getAllLetters(); // This will trigger initialization for letters
  console.log('PostgreSQL storage initialized');
}