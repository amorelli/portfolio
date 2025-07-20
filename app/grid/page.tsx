import { ColorGrid } from '../components/color-grid';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interactive Color Grid | Adam',
  description: 'A 20x20 interactive grid where clicking squares fills them with random colors. Data is stored in a SQLite database.',
  openGraph: {
    title: 'Interactive Color Grid',
    description: 'Click squares to fill them with random colors',
    type: 'website',
  },
};

export default function GridPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ColorGrid />
    </div>
  );
}