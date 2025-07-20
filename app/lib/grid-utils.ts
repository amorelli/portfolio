// Generate a random hex color
export function generateRandomColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#F4D03F',
    '#AED6F1', '#A9DFBF', '#F9E79F', '#D7BDE2', '#A3E4D7',
    '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFD1DC',
    '#E0BBE4', '#957DAD', '#D291BC', '#FEC8D8', '#FFDFD3'
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

// Generate a completely random hex color
export function generateTrueRandomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

// Create a 20x20 grid coordinate system
export function createGridCoordinates(): Array<{ x: number; y: number }> {
  const coordinates: Array<{ x: number; y: number }> = [];
  for (let x = 0; x < 20; x++) {
    for (let y = 0; y < 20; y++) {
      coordinates.push({ x, y });
    }
  }
  return coordinates;
}

// Convert grid coordinates to array index
export function coordsToIndex(x: number, y: number): number {
  return x * 20 + y;
}

// Convert array index to grid coordinates
export function indexToCoords(index: number): { x: number; y: number } {
  return {
    x: Math.floor(index / 20),
    y: index % 20
  };
}

// Validate grid coordinates
export function isValidCoordinate(x: number, y: number): boolean {
  return x >= 0 && x < 20 && y >= 0 && y < 20;
}

// Color utility functions
export function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate brightness using YIQ formula
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return brightness > 128;
}

// Get contrasting text color for a given background
export function getContrastingTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
}

// Debounce function for API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

// Grid state management types
export interface GridSquareState {
  x: number;
  y: number;
  color: string | null;
  isLoading?: boolean;
}

export interface GridState {
  squares: Map<string, GridSquareState>;
  isLoading: boolean;
  error: string | null;
}

// Create initial grid state
export function createInitialGridState(): GridState {
  const squares = new Map<string, GridSquareState>();
  
  for (let x = 0; x < 20; x++) {
    for (let y = 0; y < 20; y++) {
      const key = `${x}-${y}`;
      squares.set(key, {
        x,
        y,
        color: null,
        isLoading: false
      });
    }
  }

  return {
    squares,
    isLoading: false,
    error: null
  };
}

// Get square key from coordinates
export function getSquareKey(x: number, y: number): string {
  return `${x}-${y}`;
}