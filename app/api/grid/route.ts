import { NextRequest, NextResponse } from 'next/server';
import { gridOperations, type GridSquare } from '../../lib/database';
import { isValidCoordinate } from '../../lib/grid-utils';

// GET: Retrieve all grid squares
export async function GET() {
  try {
    const squares = gridOperations.getAllSquares.all() as GridSquare[];
    
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
  try {
    const body = await request.json();
    const { x, y, color } = body;

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
    const result = gridOperations.updateSquare.run(x, y, color);
    
    // Get the updated square to return
    const updatedSquare = gridOperations.getSquare.get(x, y) as GridSquare;

    return NextResponse.json({
      success: true,
      data: updatedSquare,
      message: 'Grid square updated successfully'
    });

  } catch (error) {
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
  try {
    const result = gridOperations.clearAllSquares.run();
    
    return NextResponse.json({
      success: true,
      message: 'All grid squares cleared successfully',
      changes: result.changes
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