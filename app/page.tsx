import { BlogPosts } from 'app/components/posts'

export default function Page() {
  return (
    <section>
      {/* <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        Hi, I'm Adam.
      </h1> */}
      {/* <img src='skull.webp' alt="Skull Gif" /> */}
      {/* <img src='spagh.png' alt="Spaghetti" /> */}
      <p className="mb-4">
        {`This site is used for experimentation and testing.`}
      </p>
      <div className="my-8">
        <BlogPosts />
      </div>
    </section>
  )
}
