import { put, head, del } from '@vercel/blob';

// Grid square type definition (keeping same interface)
export interface GridSquare {
  x: number;
  y: number;
  color: string;
  updated_at?: string;
}

// Grid data structure stored in blob
interface GridData {
  version: string;
  lastUpdated: string;
  grid: Record<string, { color: string; updated_at: string }>;
  metadata: {
    totalSquares: number;
    coloredSquares: number;
  };
}

// Constants
const BLOB_FILENAME = 'color-grid-data.json';
const GRID_SIZE = 20;
const TOTAL_SQUARES = GRID_SIZE * GRID_SIZE;

// Helper functions
function coordinateToKey(x: number, y: number): string {
  return `${x},${y}`;
}

function keyToCoordinate(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

function createEmptyGrid(): GridData {
  return {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    grid: {},
    metadata: {
      totalSquares: TOTAL_SQUARES,
      coloredSquares: 0
    }
  };
}

// Custom error class for ETag conflicts
class BlobConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlobConflictError';
  }
}

// Blob storage operations with ETag-based concurrency
class GridBlobStorage {
  private blobUrl: string | null = null;
  private lastETag: string | null = null;
  private updateQueue: Promise<any> = Promise.resolve();
  
  // Configuration for retry mechanism
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY_MS = 100;

  // Get the current blob URL from environment or construct it
  private getBlobUrl(): string {
    if (!this.blobUrl) {
      // For development, we'll construct the URL dynamically
      // In production, this would be the actual blob URL
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token) {
        throw new Error('BLOB_READ_WRITE_TOKEN is required');
      }
      // We'll use a predictable name for the blob file
      this.blobUrl = `https://blob.vercel-storage.com/${BLOB_FILENAME}`;
    }
    return this.blobUrl;
  }

  // Get current ETag by making a HEAD request
  private async getCurrentETag(): Promise<string | null> {
    try {
      const response = await fetch(this.getBlobUrl(), { method: 'HEAD' });
      if (!response.ok) {
        return null;
      }
      return response.headers.get('etag');
    } catch (error) {
      console.warn('Error getting current ETag:', error);
      return null;
    }
  }

  // Load grid data from blob storage with ETag support
  private async loadGridData(): Promise<{ data: GridData; etag: string | null }> {
    try {
      // Try to get blob metadata first to check if it exists and get ETag
      const blobInfo = await head(this.getBlobUrl()).catch(() => null);
      
      if (!blobInfo) {
        // Blob doesn't exist yet, return empty grid
        return { data: createEmptyGrid(), etag: null };
      }

      // Fetch the actual blob data
      const response = await fetch(this.getBlobUrl());
      if (!response.ok) {
        if (response.status === 404) {
          return { data: createEmptyGrid(), etag: null };
        }
        throw new Error(`Failed to fetch blob: ${response.statusText}`);
      }

      const data = await response.json() as GridData;
      const etag = response.headers.get('etag');
      
      this.lastETag = etag;
      return { data, etag };
    } catch (error) {
      console.warn('Error loading grid data, using empty grid:', error);
      return { data: createEmptyGrid(), etag: null };
    }
  }

  // Save grid data to blob storage with ETag-based concurrency and conditional writes
  private async saveGridDataWithConditionalWrite(data: GridData, expectedETag: string | null): Promise<void> {
    try {
      data.lastUpdated = new Date().toISOString();
      data.metadata.coloredSquares = Object.keys(data.grid).length;

      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });

      // For conditional writes, we need to check the current ETag before writing
      if (expectedETag) {
        // Check if the blob has been modified since we last read it
        const currentETag = await this.getCurrentETag();
        
        if (currentETag && currentETag !== expectedETag) {
          throw new BlobConflictError(`ETag mismatch: expected ${expectedETag}, got ${currentETag}`);
        }
      }

      // Upload to blob storage
      const result = await put(BLOB_FILENAME, blob, {
        access: 'public',
        allowOverwrite: true
      });

      this.blobUrl = result.url;
      this.lastETag = null; // Reset ETag since we just wrote new data
      console.log(`Grid data saved to blob: ${result.url}`);
    } catch (error) {
      if (error instanceof BlobConflictError) {
        throw error; // Re-throw conflict errors for retry logic
      }
      console.error('Error saving grid data:', error);
      throw new Error('Failed to save grid data to blob storage');
    }
  }

  // Utility method to implement exponential backoff retry logic
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof BlobConflictError && retryCount < this.MAX_RETRIES) {
        const delay = this.BASE_DELAY_MS * Math.pow(2, retryCount) + Math.random() * 100;
        console.log(`Conflict detected, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(operation, retryCount + 1);
      }
      throw error;
    }
  }

  // Save grid data with fallback to basic save for compatibility
  private async saveGridData(data: GridData, expectedETag?: string | null): Promise<void> {
    if (expectedETag !== undefined) {
      return this.saveGridDataWithConditionalWrite(data, expectedETag);
    }
    
    // Fallback for compatibility - basic save without ETag checking
    try {
      data.lastUpdated = new Date().toISOString();
      data.metadata.coloredSquares = Object.keys(data.grid).length;

      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });

      const result = await put(BLOB_FILENAME, blob, {
        access: 'public',
        allowOverwrite: true
      });

      this.blobUrl = result.url;
      console.log(`Grid data saved to blob: ${result.url}`);
    } catch (error) {
      console.error('Error saving grid data:', error);
      throw new Error('Failed to save grid data to blob storage');
    }
  }

  // Public API methods (matching the original database interface)
  async getAllSquares(): Promise<GridSquare[]> {
    try {
      const { data } = await this.loadGridData();
      
      const squares: GridSquare[] = [];
      for (const [key, value] of Object.entries(data.grid)) {
        const { x, y } = keyToCoordinate(key);
        squares.push({
          x,
          y,
          color: value.color,
          updated_at: value.updated_at
        });
      }
      
      // Sort by x, y for consistency
      squares.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
      return squares;
    } catch (error) {
      console.error('Error getting all squares:', error);
      throw error;
    }
  }

  async getSquare(x: number, y: number): Promise<GridSquare | null> {
    try {
      const { data } = await this.loadGridData();
      const key = coordinateToKey(x, y);
      const square = data.grid[key];
      
      if (!square) {
        return null;
      }
      
      return {
        x,
        y,
        color: square.color,
        updated_at: square.updated_at
      };
    } catch (error) {
      console.error('Error getting square:', error);
      throw error;
    }
  }

  async updateSquare(x: number, y: number, color: string): Promise<GridSquare> {
    return this.updateQueue = this.updateQueue.then(async () => {
      return this.retryWithBackoff(async () => {
        const { data, etag } = await this.loadGridData();
        const key = coordinateToKey(x, y);
        const timestamp = new Date().toISOString();
        
        // Update the square
        data.grid[key] = {
          color,
          updated_at: timestamp
        };
        
        // Save back to blob storage with conditional write
        await this.saveGridData(data, etag);
        
        return {
          x,
          y,
          color,
          updated_at: timestamp
        };
      });
    });
  }

  async deleteSquare(x: number, y: number): Promise<boolean> {
    return this.updateQueue = this.updateQueue.then(async () => {
      return this.retryWithBackoff(async () => {
        const { data, etag } = await this.loadGridData();
        const key = coordinateToKey(x, y);
        
        if (!data.grid[key]) {
          return false;
        }
        
        delete data.grid[key];
        await this.saveGridData(data, etag);
        return true;
      });
    });
  }

  async clearAllSquares(): Promise<number> {
    return this.updateQueue = this.updateQueue.then(async () => {
      return this.retryWithBackoff(async () => {
        const { data, etag } = await this.loadGridData();
        const deletedCount = Object.keys(data.grid).length;
        
        data.grid = {};
        await this.saveGridData(data, etag);
        
        return deletedCount;
      });
    });
  }

  async getSquareCount(): Promise<number> {
    try {
      const { data } = await this.loadGridData();
      return Object.keys(data.grid).length;
    } catch (error) {
      console.error('Error getting square count:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const gridBlobStorage = new GridBlobStorage();

// Export the operations interface (matching the original database interface)
export const gridOperations = {
  getAllSquares: () => gridBlobStorage.getAllSquares(),
  getSquare: (x: number, y: number) => gridBlobStorage.getSquare(x, y),
  updateSquare: (x: number, y: number, color: string) => gridBlobStorage.updateSquare(x, y, color),
  deleteSquare: (x: number, y: number) => gridBlobStorage.deleteSquare(x, y),
  clearAllSquares: () => gridBlobStorage.clearAllSquares(),
  getSquareCount: () => gridBlobStorage.getSquareCount()
};

// Export initialization function (no-op for blob storage, but maintains API compatibility)
export async function ensureInitialized() {
  // No initialization needed for blob storage, but we keep this function
  // to maintain API compatibility with the existing code
  console.log('Blob storage initialized (no setup required)');
}