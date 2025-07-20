'use client';

import { useState } from 'react';
import { getContrastingTextColor } from '../lib/grid-utils';

interface GridSquareProps {
  x: number;
  y: number;
  color: string | null;
  onClick: (x: number, y: number) => void;
  isLoading?: boolean;
}

export function GridSquare({ x, y, color, onClick, isLoading = false }: GridSquareProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const backgroundColor = color || '#f3f4f6';
  const textColor = color ? getContrastingTextColor(color) : '#6b7280';
  
  const handleClick = () => {
    if (!isLoading) {
      onClick(x, y);
    }
  };

  return (
    <button
      className={`
        aspect-square w-full border border-gray-200 transition-all duration-150 ease-in-out
        ${isLoading ? 'animate-pulse cursor-wait' : 'cursor-pointer hover:scale-105'}
        ${isHovered ? 'shadow-lg z-10' : ''}
        ${color ? 'hover:brightness-90' : 'hover:bg-gray-100'}
      `}
      style={{ 
        backgroundColor,
        color: textColor
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      title={`Square (${x}, ${y})${color ? ` - Color: ${color}` : ''}`}
      aria-label={`Grid square at position ${x}, ${y}${color ? `, colored ${color}` : ', empty'}`}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-xs font-mono opacity-0 hover:opacity-100 transition-opacity">
          {x},{y}
        </div>
      )}
    </button>
  );
}