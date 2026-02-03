import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CV',
  description: 'Curriculum vitae for Adam Morelli.',
}

const skills = [
  {
    label: 'Languages & Frameworks',
    value: 'JavaScript/TypeScript, PHP, Python, React, Laravel, Node.js',
  },
  {
    label: 'Backend & Data',
    value: 'REST, GraphQL, MySQL, relational and NoSQL databases',
  },
  {
    label: 'Frontend',
    value: 'React, Next.js, CSS/SASS, performance optimization, accessibility (WCAG)',
  },
  {
    label: 'DevOps & Infra',
    value: 'AWS, Docker, CI/CD, Git, monitoring, load testing (Grafana k6)',
  },
  {
    label: 'Testing',
    value: 'Jest, Playwright, Selenium, PHPUnit, TestCafe, TDD, visual regression testing',
  },
]

const experience = [
  {
    role: 'Tech Lead',
    company: '3C Institute',
    location: 'Durham, NC',
    period: '2021 - Present',
    bullets: [
      'Designed and implemented scalable full-stack solutions using React, Laravel, GraphQL, MySQL, automated testing, and AWS.',
      'Led development of the organization\'s flagship application, contributing to architecture, implementation planning, and long-term maintenance.',
      'Consolidated application services and infrastructure, reducing operational costs by nearly 50% in under one year.',
      'Built internal tools supporting research and development workflows, including a transcription service, resource platform, report builder, and time-tracking app.',
    ],
  },
  {
    role: 'Web Application Developer',
    company: '3C Institute',
    location: 'Durham, NC',
    period: '2019 - 2021',
    bullets: [
      'Built responsive web applications with React and REST APIs backed by Laravel.',
      'Maintained and customized 20+ WordPress sites, improving analytics visibility and performance.',
      'Partnered with designers and product teams to translate requirements into user-focused applications.',
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
        <div className="space-y-3">
          {skills.map((skill) => (
            <p key={skill.label} className="text-neutral-700 dark:text-neutral-300">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{skill.label}:</span>{' '}
              {skill.value}
            </p>
          ))}
        </div>
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
