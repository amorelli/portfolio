import { BlogPosts } from 'app/components/posts'

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        Adam Morelli
      </h1>
      <p className="mb-4">
        {`Hi, I'm Adam, and this is my site. I work as a web developer, primarily using React, Laravel, MySQL, GraphQL, and AWS.`}
      </p>
      <div className="my-8">
        <BlogPosts />
      </div>
    </section>
  )
}
