import Link from 'next/link'

const toys = [
  {
    title: 'Cube',
    href: '/cube',
    description: 'WebGL cube experiment and shader play.',
  },
  {
    title: 'Letters',
    href: '/letters',
    description: 'Typography, layout, and letterform explorations.',
  },
  {
    title: 'Grid',
    href: '/grid',
    description: 'Grid studies, motion, and interaction tests.',
  },
]

export default function ToysPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Toys</h1>
        <p className="text-neutral-700 dark:text-neutral-300">
          A dashboard of creative experiments and interactive sketches.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {toys.map((toy) => (
          <Link
            key={toy.href}
            href={toy.href}
            className="group rounded-2xl border border-neutral-200/60 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md dark:border-neutral-800/70 dark:bg-neutral-950/70"
          >
            <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {toy.title}
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              {toy.description}
            </p>
            <div className="mt-4 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Open
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
