'use client';

import { useState, useEffect, useCallback } from 'react';
import { GridSquare } from './grid-square';
import { 
  generateRandomColor, 
  createInitialGridState, 
  getSquareKey, 
  debounce,
  type GridState,
  type GridSquareState 
} from '../lib/grid-utils';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  count?: number;
}

export function ColorGrid() {
  const [gridState, setGridState] = useState<GridState>(createInitialGridState());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial grid data from the API
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsInitialLoading(true);
        console.log('Fetching grid data...');
        const response = await fetch('/api/grid');
        console.log('Response received:', response.status);
        const result: ApiResponse = await response.json();
        console.log('Result:', result);

        if (result.success && result.data) {
          setGridState(prevState => {
            const newState = { ...prevState };
            
            // Update squares with data from database
            result.data.forEach((square: { x: number; y: number; color: string }) => {
              const key = getSquareKey(square.x, square.y);
              const existingSquare = newState.squares.get(key);
              if (existingSquare) {
                newState.squares.set(key, {
                  ...existingSquare,
                  color: square.color
                });
              }
            });

            return newState;
          });
        } else {
          setError(result.error || 'Failed to load grid data');
        }
      } catch (err) {
        setError('Failed to connect to the server');
        console.error('Error loading initial grid data:', err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Debounced API call to update square color
  const updateSquareInDatabase = useCallback(
    debounce(async (x: number, y: number, color: string) => {
      try {
        const response = await fetch('/api/grid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ x, y, color }),
        });

        const result: ApiResponse = await response.json();

        if (!result.success) {
          // Revert optimistic update on error
          setGridState(prevState => {
            const newState = { ...prevState };
            const key = getSquareKey(x, y);
            const square = newState.squares.get(key);
            if (square) {
              newState.squares.set(key, {
                ...square,
                color: null, // Revert to empty
                isLoading: false
              });
            }
            return newState;
          });
          setError(result.error || 'Failed to update square');
        } else {
          // Confirm the update was successful
          setGridState(prevState => {
            const newState = { ...prevState };
            const key = getSquareKey(x, y);
            const square = newState.squares.get(key);
            if (square) {
              newState.squares.set(key, {
                ...square,
                isLoading: false
              });
            }
            return newState;
          });
        }
      } catch (err) {
        // Revert optimistic update on network error
        setGridState(prevState => {
          const newState = { ...prevState };
          const key = getSquareKey(x, y);
          const square = newState.squares.get(key);
          if (square) {
            newState.squares.set(key, {
              ...square,
              color: null,
              isLoading: false
            });
          }
          return newState;
        });
        setError('Network error occurred');
        console.error('Network error updating square:', err);
      }
    }, 300),
    []
  );

  // Handle square click - optimistic update + API call
  const handleSquareClick = useCallback((x: number, y: number) => {
    const key = getSquareKey(x, y);
    const square = gridState.squares.get(key);
    
    if (!square || square.isLoading) return;

    const newColor = generateRandomColor();

    // Optimistic update
    setGridState(prevState => {
      const newState = { ...prevState };
      newState.squares.set(key, {
        ...square,
        color: newColor,
        isLoading: true
      });
      return newState;
    });

    // Clear any previous errors
    setError(null);

    // Update database
    updateSquareInDatabase(x, y, newColor);
  }, [gridState.squares, updateSquareInDatabase]);

  // Clear all squares
  const handleClearAll = async () => {
    try {
      setIsInitialLoading(true);
      const response = await fetch('/api/grid', {
        method: 'DELETE',
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        // Reset all squares to empty
        setGridState(createInitialGridState());
        setError(null);
      } else {
        setError(result.error || 'Failed to clear grid');
      }
    } catch (err) {
      setError('Failed to clear grid');
      console.error('Error clearing grid:', err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading grid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Interactive Color Grid</h1>
          <p className="text-gray-600">Click any square to fill it with a random color</p>
        </div>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Grid */}
      <div 
        className="grid grid-cols-20 gap-0 border border-gray-300 bg-white shadow-lg"
        style={{ aspectRatio: '1' }}
      >
        {Array.from({ length: 20 }, (_, x) =>
          Array.from({ length: 20 }, (_, y) => {
            const key = getSquareKey(x, y);
            const square = gridState.squares.get(key);
            
            return (
              <GridSquare
                key={key}
                x={x}
                y={y}
                color={square?.color || null}
                onClick={handleSquareClick}
                isLoading={square?.isLoading || false}
              />
            );
          })
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 text-center text-sm text-gray-500">
        {Array.from(gridState.squares.values()).filter(s => s.color).length} of 400 squares colored
      </div>
    </div>
  );
}