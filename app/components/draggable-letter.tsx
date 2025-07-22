'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface DraggedLetterProps {
  id: string;
  character: string;
  x: number;
  y: number;
  onDrag: (id: string, character: string, x: number, y: number) => void;
  onDrop: (id: string, character: string, x: number, y: number) => void;
}

export function DraggableLetter({ id, character, x, y, onDrag, onDrop }: DraggedLetterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState({ x, y });
  const letterRef = useRef<HTMLDivElement>(null);

  // Update current position when props change
  useEffect(() => {
    setCurrentPosition({ x, y });
  }, [x, y]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!letterRef.current) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = letterRef.current.getBoundingClientRect();
    const containerRect = letterRef.current.offsetParent?.getBoundingClientRect();
    
    if (containerRect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !letterRef.current?.offsetParent) return;
    
    const containerRect = letterRef.current.offsetParent.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;
    
    // Constrain to container bounds
    const constrainedX = Math.max(0, Math.min(newX, containerRect.width - 50));
    const constrainedY = Math.max(0, Math.min(newY, containerRect.height - 50));
    
    setCurrentPosition({ x: constrainedX, y: constrainedY });
    onDrag(id, character, constrainedX, constrainedY);
  }, [isDragging, dragOffset, id, character, onDrag]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      onDrop(id, character, currentPosition.x, currentPosition.y);
    }
    setIsDragging(false);
  }, [isDragging, id, character, currentPosition, onDrop]);

  // Attach global mouse events for smooth dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch events for mobile support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!letterRef.current || e.touches.length !== 1) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    
    const rect = letterRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !letterRef.current?.offsetParent || e.touches.length !== 1) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const containerRect = letterRef.current.offsetParent.getBoundingClientRect();
    const newX = touch.clientX - containerRect.left - dragOffset.x;
    const newY = touch.clientY - containerRect.top - dragOffset.y;
    
    // Constrain to container bounds
    const constrainedX = Math.max(0, Math.min(newX, containerRect.width - 50));
    const constrainedY = Math.max(0, Math.min(newY, containerRect.height - 50));
    
    setCurrentPosition({ x: constrainedX, y: constrainedY });
    onDrag(id, character, constrainedX, constrainedY);
  }, [isDragging, dragOffset, id, character, onDrag]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      onDrop(id, character, currentPosition.x, currentPosition.y);
    }
    setIsDragging(false);
  }, [isDragging, id, character, currentPosition, onDrop]);

  // Attach global touch events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  const isSymbol = !/[A-Za-z]/.test(character);
  
  return (
    <div
      ref={letterRef}
      className={`
        absolute select-none cursor-grab transition-all duration-150
        ${isDragging ? 'cursor-grabbing scale-110 z-50' : 'hover:scale-105 z-10'}
        ${isDragging ? 'shadow-2xl' : 'shadow-lg hover:shadow-xl'}
      `}
      style={{
        left: `${isDragging ? currentPosition.x : x}px`,
        top: `${isDragging ? currentPosition.y : y}px`,
        transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className={`
          w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold
          border-2 transition-all duration-150
          ${isSymbol 
            ? 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200' 
            : 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200'
          }
          ${isDragging ? 'ring-4 ring-blue-300 ring-opacity-50' : ''}
        `}
      >
        {character}
      </div>
      
      {/* Visual feedback when dragging */}
      {isDragging && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {Math.round(currentPosition.x)}, {Math.round(currentPosition.y)}
          </div>
        </div>
      )}
    </div>
  );
}