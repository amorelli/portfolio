'use client';

import { useState, useEffect } from 'react';
import { DraggableLetter } from '../components/draggable-letter';
import { LetterPosition } from '../lib/postgres-storage';

// Define the alphabet and symbols to display
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SYMBOLS = ['!', '@', '#', '$', '%', '&', '*', '(', ')', '-', '+', '='];
const ALL_CHARACTERS = [...ALPHABET, ...SYMBOLS];

export default function LettersPage() {
  const [letters, setLetters] = useState<LetterPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load letter positions from the database
  useEffect(() => {
    loadLetterPositions();
  }, []);

  const loadLetterPositions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/letters');
      const data = await response.json();
      
      if (data.success) {
        setLetters(data.data);
        // Initialize any letters that don't exist in the database yet
        initializeMissingLetters(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load letter positions');
      console.error('Error loading letters:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializeMissingLetters = (existingLetters: LetterPosition[]) => {
    const existingCharacters = new Set(existingLetters.map(letter => letter.character));
    const missingCharacters = ALL_CHARACTERS.filter(char => !existingCharacters.has(char));
    
    // Create default positions for missing letters
    missingCharacters.forEach((character, index) => {
      const row = Math.floor(index / 13); // 13 characters per row
      const col = index % 13;
      const x = 50 + (col * 60); // 60px spacing horizontally
      const y = 50 + (row * 80); // 80px spacing vertically
      
      const newLetter: LetterPosition = {
        id: `${character}-${Date.now()}-${index}`,
        character,
        x,
        y
      };
      
      // Add to state immediately for UI responsiveness
      setLetters(prev => [...prev, newLetter]);
      
      // Save to database (fire and forget)
      saveLetterPosition(newLetter.id, newLetter.character, newLetter.x, newLetter.y);
    });
  };

  const saveLetterPosition = async (id: string, character: string, x: number, y: number) => {
    try {
      const response = await fetch('/api/letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, character, x, y }),
      });
      
      const data = await response.json();
      if (!data.success) {
        console.error('Failed to save letter position:', data.error);
      }
    } catch (err) {
      console.error('Error saving letter position:', err);
    }
  };

  const handleLetterDrag = (id: string, character: string, x: number, y: number) => {
    // Update local state immediately for smooth UI
    setLetters(prev => prev.map(letter =>
      letter.id === id ? { ...letter, x, y } : letter
    ));
  };

  const handleLetterDrop = (id: string, character: string, x: number, y: number) => {
    // Update local state to final position
    setLetters(prev => prev.map(letter =>
      letter.id === id ? { ...letter, x, y } : letter
    ));
    
    // Save to database only when dropped
    saveLetterPosition(id, character, x, y);
  };

  const clearAllLetters = async () => {
    try {
      const response = await fetch('/api/letters', {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        setLetters([]);
        // Reinitialize with default positions
        setTimeout(() => initializeMissingLetters([]), 100);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to clear letters');
      console.error('Error clearing letters:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading letters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error: {error}</div>
          <button 
            onClick={loadLetterPositions}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Draggable Letters</h1>
              <p className="text-gray-600">Drag and drop letters to arrange them on the canvas</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={clearAllLetters}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Reset Positions
              </button>
              <button
                onClick={loadLetterPositions}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Canvas Area */}
      <main className="relative">
        <div className="canvas-container relative w-full min-h-[800px] bg-white border-2 border-dashed border-gray-200 mx-4 my-4 rounded-lg overflow-hidden">
          {/* Grid background for visual reference */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}
          />
          
          {/* Draggable Letters */}
          {letters.map((letter) => (
            <DraggableLetter
              key={letter.id}
              id={letter.id}
              character={letter.character}
              x={letter.x}
              y={letter.y}
              onDrag={handleLetterDrag}
              onDrop={handleLetterDrop}
            />
          ))}
        </div>
      </main>
    </div>
  );
}