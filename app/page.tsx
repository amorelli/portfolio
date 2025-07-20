import { BlogPosts } from 'app/components/posts'
import skullWebp from './images/skull.webp'
import spaghetti from './images/spagh.png'

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
