import { NextRequest, NextResponse } from 'next/server';
import { gridOperations, ensureInitialized, type GridSquare } from '../../lib/blob-storage';
import { isValidCoordinate } from '../../lib/grid-utils';

// Add comprehensive logging for debugging
function logRequest(method: string, details: any = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔍 API Route Debug: ${method}`, details);
}

// GET: Retrieve all grid squares
export async function GET() {
  logRequest('GET', { route: '/api/grid' });
  try {
    // Ensure database is initialized
    await ensureInitialized();
    
    const squares = await gridOperations.getAllSquares();
    
    return NextResponse.json({
      success: true,
      data: squares,
      count: squares.length
    });
  } catch (error) {
    console.error('Error fetching grid squares:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch grid squares',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Update a grid square with a new color
export async function POST(request: NextRequest) {
  logRequest('POST', {
    route: '/api/grid',
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    method: request.method
  });
  
  try {
    // Ensure database is initialized
    await ensureInitialized();
    
    const body = await request.json();
    const { x, y, color } = body;
    
    logRequest('POST - Body Parsed', { x, y, color });

    // Validate input
    if (typeof x !== 'number' || typeof y !== 'number' || typeof color !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input: x and y must be numbers, color must be a string' 
        },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (!isValidCoordinate(x, y)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid coordinates: x and y must be between 0 and 19' 
        },
        { status: 400 }
      );
    }

    // Validate color format (basic hex color validation)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(color)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid color format: must be a valid hex color (e.g., #FF0000)' 
        },
        { status: 400 }
      );
    }

    // Update the square in the database
    logRequest('POST - Updating Database', { x, y, color });
    const updatedSquare = await gridOperations.updateSquare(x, y, color);

    logRequest('POST - Success', { updatedSquare });
    return NextResponse.json({
      success: true,
      data: updatedSquare,
      message: 'Grid square updated successfully'
    });

  } catch (error) {
    logRequest('POST - Error', { error: error instanceof Error ? error.message : error });
    console.error('Error updating grid square:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update grid square',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE: Clear all grid squares
export async function DELETE() {
  logRequest('DELETE', { route: '/api/grid' });
  try {
    // Ensure database is initialized
    await ensureInitialized();
    
    const deletedCount = await gridOperations.clearAllSquares();
    
    return NextResponse.json({
      success: true,
      message: 'All grid squares cleared successfully',
      changes: deletedCount
    });

  } catch (error) {
    console.error('Error clearing grid squares:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear grid squares',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}