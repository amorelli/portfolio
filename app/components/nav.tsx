import Link from 'next/link'

const navItems = {
  '/': {
    name: 'home',
  },
  '/blog': {
    name: 'blog',
  },
  '/grid': {
    name: 'grid',
  }
}

export function Navbar() {
  return (
    <header className="mb-16 tracking-tight">
      <div className="lg:sticky lg:top-20">
        <div className="container flex flex-col items-start justify-between mx-auto md:flex-row md:items-center">
          <a className="text-lg font-bold text-neutral-900 dark:text-neutral-100" href="/">Adam</a>
          <nav
            className="flex flex-row items-start relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative"
            id="nav"
          >
            <div className="flex flex-row space-x-0">
              {Object.entries(navItems).map(([path, { name }]) => {
                return (
                  <Link
                    key={path}
                    href={path}
                    className="transition-all text-neutral-700 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100 flex align-middle relative py-1 px-2 m-1"
                  >
                    {name}
                  </Link>
                )
              })}
            </div>
          </nav>
          </div>
      </div>
    </header>
  )
}
