import { useEffect, useState } from "react"
import { useRouter } from "next/router"

export default function BlogPostSelector({ currentBlog = null }) {
  const router = useRouter()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const loadBlogs = async () => {
      try {
        const response = await fetch("/api/blog", { signal: controller.signal })
        if (!response.ok) throw new Error(`Blog list request failed: ${response.status}`)
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error("Invalid blog list response")
        if (!controller.signal.aborted) setBlogs(data)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to load blog selector:", error)
          setLoadError(true)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadBlogs()
    return () => controller.abort()
  }, [])

  const availableBlogs = blogs.filter((blog) => Number.isInteger(blog?.blogID) && blog.blogID > 0)
  if (currentBlog?.blogID && !availableBlogs.some((blog) => blog.blogID === currentBlog.blogID)) {
    availableBlogs.unshift(currentBlog)
  }
  availableBlogs.sort((first, second) =>
    String(first.title || first.path || "").localeCompare(String(second.title || second.path || "")),
  )

  const selectBlog = (event) => {
    const value = event.target.value
    const destination = value === "new"
      ? "/portal/staff/tagblog"
      : `/portal/staff/tagblog/${value}/update`
    router.push(destination)
  }

  return (
    <div className="mb-6 w-full max-w-xl">
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Blog post</span>
        <select
          className="select select-bordered w-full"
          value={currentBlog?.blogID ? String(currentBlog.blogID) : "new"}
          onChange={selectBlog}
          aria-busy={loading}
        >
          <option value="new">Create new blog post</option>
          {loading && <option disabled>Loading blog posts...</option>}
          {availableBlogs.map((blog) => (
            <option key={blog.blogID} value={String(blog.blogID)}>
              {blog.title || blog.path || `Blog #${blog.blogID}`}
            </option>
          ))}
        </select>
      </label>
      {loadError && (
        <p className="mt-2 text-sm text-error" role="alert">Unable to load blog posts. Refresh the page to try again.</p>
      )}
    </div>
  )
}