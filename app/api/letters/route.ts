import { NextRequest, NextResponse } from 'next/server';
import { letterOperations, ensureInitialized, type LetterPosition } from '../../lib/postgres-storage';

// Add comprehensive logging for debugging
function logRequest(method: string, details: any = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔍 Letters API Route Debug: ${method}`, details);
}

// GET: Retrieve all letter positions
export async function GET() {
  logRequest('GET', { route: '/api/letters' });
  try {
    // Ensure database is initialized
    await ensureInitialized();
    
    const letters = await letterOperations.getAllLetters();
    
    return NextResponse.json({
      success: true,
      data: letters,
      count: letters.length
    });
  } catch (error) {
    console.error('Error fetching letter positions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch letter positions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Update a letter position
export async function POST(request: NextRequest) {
  logRequest('POST', {
    route: '/api/letters',
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    method: request.method
  });
  
  try {
    // Ensure database is initialized
    await ensureInitialized();
    
    const body = await request.json();
    const { id, character, x, y } = body;
    
    logRequest('POST - Body Parsed', { id, character, x, y });

    // Validate input
    if (typeof id !== 'string' || typeof character !== 'string' || typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input: id and character must be strings, x and y must be numbers' 
        },
        { status: 400 }
      );
    }

    // Validate character (should be a single character)
    if (character.length !== 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid character: must be a single character' 
        },
        { status: 400 }
      );
    }

    // Validate coordinates (should be reasonable values for canvas)
    if (x < 0 || y < 0 || x > 2000 || y > 2000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid coordinates: x and y must be between 0 and 2000' 
        },
        { status: 400 }
      );
    }

    // Update the letter position in the database
    logRequest('POST - Updating Database', { id, character, x, y });
    const updatedLetter = await letterOperations.updateLetterPosition(id, character, x, y);

    logRequest('POST - Success', { updatedLetter });
    return NextResponse.json({
      success: true,
      data: updatedLetter,
      message: 'Letter position updated successfully'
    });

  } catch (error) {
    logRequest('POST - Error', { error: error instanceof Error ? error.message : error });
    console.error('Error updating letter position:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update letter position',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE: Clear all letter positions or delete a specific letter
export async function DELETE(request: NextRequest) {
  logRequest('DELETE', { route: '/api/letters' });
  
  try {
    // Ensure database is initialized
    await ensureInitialized();
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id) {
      // Delete specific letter
      const deleted = await letterOperations.deleteLetter(id);
      
      if (!deleted) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Letter not found' 
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Letter deleted successfully'
      });
    } else {
      // Clear all letters
      const deletedCount = await letterOperations.clearAllLetters();
      
      return NextResponse.json({
        success: true,
        message: 'All letter positions cleared successfully',
        changes: deletedCount
      });
    }

  } catch (error) {
    console.error('Error deleting letter positions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete letter positions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}