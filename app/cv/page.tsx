import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CV',
  description: 'Curriculum vitae for Adam Morelli.',
}

const skills =
  'JavaScript/TypeScript, Laravel PHP, React, Next.js, Node.js, REST and GraphQL APIs, MySQL, relational and NoSQL databases, AWS, Docker, Jenkins, Jest, Playwright, Selenium, PHPUnit, Accessibility (WCAG)'

const experience = [
  {
    role: 'Tech Lead',
    company: '3C Institute',
    location: 'Durham, NC',
    period: '2021 - Present',
    bullets: [
      'Designed and implemented scalable production systems across frontend, backend, and infrastructure using React, Laravel, GraphQL, MySQL, and AWS.',
      'Contributed to system architecture and led development of the organization\'s flagship application from planning through ongoing iteration.',
      'Improved operational efficiency by consolidating infrastructure, reducing costs by nearly 50% in under one year.',
      'Built internal platforms and tools to support engineering and research workflows, including data processing, reporting, and automation tools.',
      'Collaborated with cross-functional teams and stakeholders to refine requirements, deliver features, and support production systems.',
    ],
  },
  {
    role: 'Web Application Developer',
    company: '3C Institute',
    location: 'Durham, NC',
    period: '2019 - 2021',
    bullets: [
      'Developed and maintained production web applications using React and Laravel.',
      'Supported multiple customer-facing and internal systems, contributing to feature development, performance improvements, and bug fixes.',
      'Worked closely with designers and product teams to translate requirements into functional software.',
    ],
  },
]

const education = [
  'McMaster University - Web Design & Development',
  'University of Toronto - Commerce',
]

export default function CvPage() {
  return (
    <section className="space-y-10 pb-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Adam Morelli
          </h1>
          <a
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
            href="/Adam-Morelli-CV.pdf"
            download
          >
            Download PDF
          </a>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Senior Full-Stack Engineer
        </p>
        <p className="max-w-3xl text-neutral-700 dark:text-neutral-300">
          Full-stack software engineer with experience designing, building, and operating scalable web applications. Strong across frontend, backend, and infrastructure, with a focus on maintainable architectures, automated testing, and reliable CI/CD. Comfortable owning systems end-to-end in collaborative teams.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-700 dark:text-neutral-300">
          <a className="underline underline-offset-4" href="mailto:amorelli@gmail.com">
            amorelli@gmail.com
          </a>
          <a
            className="underline underline-offset-4"
            href="https://www.linkedin.com/in/adam-david-morelli"
            rel="noopener noreferrer"
            target="_blank"
          >
            linkedin.com/in/adam-david-morelli
          </a>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Skills
        </h2>
        <p className="text-neutral-700 dark:text-neutral-300">{skills}</p>
      </section>

      <section className="space-y-5">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Experience
        </h2>
        <div className="space-y-6">
          {experience.map((job) => (
            <article key={`${job.role}-${job.period}`} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                  {job.role} - {job.company}, {job.location}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{job.period}</p>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-neutral-700 dark:text-neutral-300">
                {job.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Education
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-neutral-700 dark:text-neutral-300">
          {education.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </section>
  )
}
