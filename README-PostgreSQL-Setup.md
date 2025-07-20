# PostgreSQL Setup Guide for Portfolio Grid

This guide covers setting up PostgreSQL for local development and Vercel deployment.

## Quick Start Summary

✅ **Migration Complete**: Your portfolio now uses PostgreSQL instead of SQLite
✅ **Vercel Ready**: Compatible with Vercel's PostgreSQL service
✅ **Async Operations**: All database operations are now async-first

## Local Development Options

### Option 1: Vercel Postgres (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` to link your project
3. Create a Vercel Postgres database in your Vercel dashboard
4. Run `vercel env pull .env.local` to get environment variables
5. Start development: `npm run dev`

### Option 2: Local PostgreSQL with Docker
```bash
# Start PostgreSQL container
docker run --name portfolio-postgres \
  -e POSTGRES_DB=portfolio_grid \
  -e POSTGRES_USER=portfolio \
  -e POSTGRES_PASSWORD=password123 \
  -p 5432:5432 \
  -d postgres:15

# Update .env.local
POSTGRES_URL="postgresql://portfolio:password123@localhost:5432/portfolio_grid"
```

### Option 3: Local PostgreSQL Installation
1. Install PostgreSQL on your system
2. Create database: `createdb portfolio_grid`
3. Update `.env.local` with your connection string

## Environment Variables

Update your `.env.local` file with one of these configurations:

### For Vercel Postgres:
```env
POSTGRES_URL="your_vercel_postgres_connection_string"
POSTGRES_PRISMA_URL="your_vercel_postgres_prisma_url" 
POSTGRES_URL_NON_POOLING="your_vercel_postgres_non_pooling_url"
```

### For Local Development:
```env
POSTGRES_URL="postgresql://username:password@localhost:5432/portfolio_grid"
```

## Database Schema

The application automatically creates the required table on first run:

```sql
CREATE TABLE IF NOT EXISTS grid_squares (
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  color TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (x, y)
);

CREATE INDEX IF NOT EXISTS idx_grid_coordinates ON grid_squares(x, y);
```

## Key Changes Made

1. **Dependencies**: Replaced `better-sqlite3` with `@vercel/postgres`
2. **Database Operations**: Now async (`await` required)
3. **SQL Syntax**: Updated for PostgreSQL compatibility
4. **Connection Management**: Uses connection pooling
5. **Error Handling**: Enhanced for network-based database

## API Endpoints

All endpoints remain the same but now work with PostgreSQL:

- `GET /api/grid` - Fetch all grid squares
- `POST /api/grid` - Update a grid square color
- `DELETE /api/grid` - Clear all grid squares

## Testing the Migration

1. Start your development server: `npm run dev`
2. Visit `http://localhost:3000/grid`
3. Click squares to change colors
4. Verify data persists across page reloads

## Vercel Deployment

1. **Create Vercel Postgres Database**:
   - Go to your Vercel dashboard
   - Navigate to Storage → Create → Postgres
   - Name your database (e.g., `portfolio-grid-db`)

2. **Environment Variables**:
   - Vercel automatically sets `POSTGRES_URL` and related variables
   - No manual configuration needed

3. **Deploy**:
   ```bash
   git add .
   git commit -m "Migrate to PostgreSQL"
   git push origin main
   ```

4. **Verify Deployment**:
   - Visit your deployed app
   - Test grid functionality
   - Check Vercel function logs for any issues

## Troubleshooting

### Connection Issues
- Ensure `POSTGRES_URL` is correctly set
- Check network connectivity to your database
- Verify database credentials

### Permission Errors
- Ensure database user has CREATE and INSERT permissions
- Check if database exists

### Local Development Issues
- Make sure PostgreSQL is running
- Verify port 5432 is available
- Check firewall settings

### Vercel Deployment Issues
- Verify environment variables are set in Vercel dashboard
- Check function logs in Vercel dashboard
- Ensure Vercel Postgres database is in the same region

## Performance Notes

- PostgreSQL handles concurrent access better than SQLite
- Connection pooling is handled automatically by `@vercel/postgres`
- Database initialization happens on first API call
- Queries are optimized with proper indexing

## Next Steps

Your portfolio is now ready for production deployment on Vercel with persistent PostgreSQL storage!