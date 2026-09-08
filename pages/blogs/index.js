/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import TagSEO from "@/components/TagSEO"
import BlogCard from "@/components/cards/card_blog"
import serverFetch from "@/libs/serverFetch"

const Blog = (props) => {
  const pageMetaData = {
    title: "TAG Blog",
    description: "Read artist spotlights, platform updates, and practical guides for building visibility and creative income.",
    keywords: "art blog, artist stories, creator insights, platform updates",
    robots: "index, follow",
    author: "Bobb Shields",
    viewport: "width=device-width, initial-scale=1.0",
    og: {
      title: "TAG Blog | Platform Blog",
      description: "Artist spotlights, platform updates, and practical insights for creative growth.",
    },
  }
  
  return (
    
      <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
        <TagSEO metadataProp={pageMetaData} canonicalSlug="blogs" />
        
        {/* Hero Section */}
        <section className="text-center py-12 bg-linear-to-br from-base-200 to-base-100">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 text-primary">
            TAG Blog
          </h1>
          <p className="text-xl md:text-2xl text-base-content/80 mb-6 max-w-3xl mx-auto px-4">
            Platform updates, transparency on our direction, and practical guidance for thriving as an artist here.
          </p>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto px-4">
            From product launches and safety updates to long-term vision—this is how we stay open about what we're building and why.
          </p>
        </section>
        
        {/* Blog Grid */}
        <main className="container mx-auto px-4 py-8 flex-1 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {props.blogs.map((blog) => (
              <BlogCard key={blog.path} blog={blog} showIdentityGlow={false} />
            ))}
          </div>
        </main>
      </div>
    
  )
}

Blog.getInitialProps = async () => {
  let data = []

  try {
    const res = await serverFetch("/blog")
    data = await res.json()
  } catch (error) {
    console.error("Error fetching blogs:", error)
  }

  return {
    blogs: data || [],
  }
}

export default Blog

