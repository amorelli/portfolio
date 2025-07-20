'use client';

import { useState, useEffect } from 'react';

export function SimpleGrid() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('SimpleGrid component mounted');
    
    const fetchData = async () => {
      try {
        console.log('Starting fetch...');
        const response = await fetch('/api/grid');
        console.log('Fetch response:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API result:', result);
        
        setData(result.data || []);
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1>Simple Grid Test</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1>Simple Grid Test</h1>
        <p className="text-red-500">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Grid Test</h1>
      <p className="mb-4">Data loaded successfully!</p>
      <p className="mb-4">Found {data.length} squares in database</p>
      
      {data.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Stored squares:</h2>
          <ul>
            {data.map((square: any, index: number) => (
              <li key={index} className="mb-1">
                Square ({square.x}, {square.y}) - Color: {square.color}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-5 gap-2 w-60">
        {Array.from({ length: 25 }, (_, i) => (
          <div
            key={i}
            className="w-12 h-12 border border-gray-300 bg-gray-100 hover:bg-gray-200 cursor-pointer flex items-center justify-center text-xs"
            onClick={() => console.log(`Clicked square ${i}`)}
          >
            {i}
          </div>
        ))}
      </div>
    </div>
  );
}