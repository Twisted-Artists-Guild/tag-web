/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/


import Image from "next/image"
import Link from "next/link"
import TagSEO from "@/components/TagSEO"
import NewsCard from "@/components/cards/card_news"
import serverFetch from "@/libs/serverFetch"

const featuredArticles = [
  {
    id: "beyond-canvas",
    title: "Beyond the Canvas: Meet Amina Rodriguez, a Multidisciplinary Storyteller",
    description:
      "Amina blends textile, digital collage, and immersive installations to explore identity and memory. We unpack her process, her cooperative mindset, and how shared authorship shapes her latest exhibition.",
    image: "https://tagstatic.blob.core.windows.net/pexels/pexels-valeriiamiller-3547625-artistpainting.jpg",
    alt: "Artist painting on a canvas",
    enableSocial: true,
  },
  {
    id: "member-interviews",
    title: "What Artists Really Need: Insights from Our Member Interviews",
    description:
      "From tools to pricing, our journalists analyzed data from extended interviews with TAG members to uncover what drives artist success-and what platforms must evolve to meet their needs.",
    image: "https://tagstatic.blob.core.windows.net/pexels/pexels-daiangan-102127-paintpallette.jpg",
    alt: "Artist's paint palette with brushes",
  },
  {
    id: "art-algorithms",
    title: "Art & Algorithms: How Creatives Are Hacking AI for Good",
    description:
      "We explore how TAG artists are turning generative tech into collaborative tools-from training models on personal portfolios to co-authoring with bots. This isn't automation; it's augmentation.",
    image: "https://tagstatic.blob.core.windows.net/pexels/pexels-brett-sayles-1340502-artistpaintingmural.jpg",
    alt: "Artist painting a large mural",
  },
  {
    id: "studio-cooperative",
    title: "The Studio is the Cooperative: Why Shared Governance Fuels Better Art",
    description:
      "A deep dive into how collective decision-making-from stock buybacks to platform features-is rewriting what creative ownership can look like. Hear from members building this new reality.",
    image: "https://tagstatic.blob.core.windows.net/pexels/pexels-thfotodesign-3253724-artistpaintingmural3.jpg",
    alt: "Artist working on a large mural in a studio",
  },
]


function toUniformPlainText(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function News(props) {
  const pageMetaData = {
    title: "TAG News Service",
    description: "Read artist interviews, community stories, and cultural coverage from the News Service.",
    keywords: "artist interviews, art news, community stories, TAG news service",
    og: {
      title: "TAG News Service | Artist Stories and Coverage",
      description: "Artist interviews, community stories, and cultural coverage from Platform.",
    },
  }

  return (
    
    <div className="min-h-screen flex flex-col bg-base-100 text-base-content">
      <TagSEO metadataProp={pageMetaData} canonicalSlug="news" />
      {/* Hero Section */}
      <section className="text-center py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        <div className="relative z-20">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-primary">
            TAG News Service
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-white">
            
          </p>
        </div>
        <div className="absolute inset-0 -z-10">
          <Image
            src="https://tagstatic.blob.core.windows.net/pexels/pexels-markus-winkler-1430818-3812433-merchandiseclothingrack.jpg"
            alt="News service background image"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        </div>
      </section>
      <main className="container mx-auto px-4 py-8 flex-1 w-full">
        {/* News Service Section */}
        <section className="py-12 bg-base-100 rounded-box shadow-lg px-6 mb-12">
          <h2 className="text-2xl font-bold mb-4 text-primary text-center">
            By Artists, For Artists
          </h2>
          <div className="max-w-4xl mx-auto text-center mb-12">
            <p className="text-lg text-base-content/80 mb-6">
              The TAG News Service spotlights the lives, ideas, and creative journeys of our community. Through interviews, cultural coverage, and research, we document what it means to be a working artist today—with integrity, curiosity, and artist-first perspective.
            </p>
            <p className="text-lg text-base-content/80">
              Our writers blend narrative storytelling with community insight, conducting interviews with artists, capturing conversations, and producing content that celebrates visibility and discovery. We follow ethical journalistic standards while staying rooted in the voices of creators.
            </p>
          </div>
          <h3 className="text-xl font-bold mb-8 text-center text-primary">
            Stories, Spotlights, and News
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Featured Articles + Blog Posts Combined */}
            {[
              ...featuredArticles.map((item) => ({
                ...item,
                id: item.id,
                url: `/news/${item.id}`,
                badge: "News",
                summary: item.description,
                date: "2026-09-17",
                authorName: "TAG Editorial",
                tags: ["Community", "Feature"],
                image: item.image,
              })),
              ...(props.blogs || []).map((blog) => ({
                id: `blog-${blog.path}`,
                title: toUniformPlainText(blog.title),
                summary: blog.byline || blog.summary || "",
                image: blog.image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
                badge: "Blog",
                date: blog.created || blog.date,
                authorName: blog.author || "TAG Community",
                tags: Array.isArray(blog.tags) ? blog.tags : ["Blog"],
                href: `/blogs/${blog.path}`,
              })),
            ].map((item) => (
              <NewsCard
                key={item.id}
                news={{
                  id: item.id,
                  title: item.title,
                  summary: item.summary,
                  image: item.image,
                  href: item.href || item.url,
                  description: item.summary,
                  date: item.date,
                  authorName: item.authorName,
                  tags: item.tags,
                }}
                size="md"
                orientation="vertical"
                showIdentityGlow={false}
              />
            ))}
          </div>
        </section>



        {/* Call to Action / Footer */}
        <section className="py-16 bg-linear-to-r from-purple-800 to-pink-700 rounded-box shadow-lg px-6">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-base-100">Stay Informed with TAG News</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-base-100">
              Subscribe to our newsletter for the latest articles, artist spotlights, and industry insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/newsletter" className="btn btn-lg btn-primary">
                Subscribe to Newsletter
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
    
  )
}

News.getInitialProps = async () => {
  let blogs = []
  
  // Fetch the blog data to display alongside featured articles
  try {
    if (process.env.DEBUG === "true") {
      console.log("News page blog data fetch starting\n /api/blog/")
    }
    const res = await serverFetch("/blog/")
    if (res.ok) {
      blogs = await res.json()
    }
    if (process.env.DEBUG === "true") {
      console.log(`News page blog data fetched. Count: ${blogs.length}`)
    }
  } catch (error) {
    console.error("An error occurred fetching blog data for news page: ", error)
  }

  return {
    blogs: blogs || [],
  }
}




