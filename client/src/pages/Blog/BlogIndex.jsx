import { useCallback, useEffect, useRef, useState } from 'react'
import SEO, { ORGANIZATION_ID, absoluteUrl, graph } from '@/components/common/SEO'
import { Link, useSearchParams } from 'react-router-dom'
import { blogApi } from '@/services/blog'
import { mediaUrl } from '@/services/api'
import { formatDate } from '@/utils/format'
import PostCard from './PostCard'
import '@/styles/blog.css'

/**
 * The blog listing — /blog
 *
 * State lives in the URL (?category=&search=&page=) rather than in
 * component state. That is what makes a filtered view shareable, makes the
 * browser back button step back through filters the way a visitor expects,
 * and survives a refresh. It is also the deep-linking the navigation
 * guidance asks for.
 */
export default function BlogIndex() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const search = params.get('search') || ''
  const page = Number(params.get('page') || 1)

  const [data, setData] = useState(null)
  const [taxonomy, setTaxonomy] = useState({ categories: [] })
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  // Mirrors the URL but updates on every keystroke, so the input stays
  // responsive while the actual query is debounced below.
  const [searchDraft, setSearchDraft] = useState(search)


  useEffect(() => {
    const controller = new AbortController()
    blogApi.taxonomy(controller.signal).then(setTaxonomy).catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setFailed(false)

    blogApi
      .listPosts({ category, search, page }, controller.signal)
      .then((result) => {
        setData(result)
        setFailed(false)
      })
      .catch((error) => {
        // An aborted request is a superseded one, not a failure — showing an
        // error for it would flash a message every time the user types.
        if (error.name === 'AbortError') return
        setFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [category, search, page])

  // Keep the input in step when the URL changes from outside it — a back
  // navigation, or a click on a category chip.
  useEffect(() => setSearchDraft(search), [search])

  const timer = useRef(null)
  const onSearchChange = useCallback((value) => {
    setSearchDraft(value)
    clearTimeout(timer.current)
    // 350ms: long enough that a normal typing cadence produces one request,
    // short enough that the result feels like it is following you.
    timer.current = setTimeout(() => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('search', value)
        else next.delete('search')
        next.delete('page')   // a new query starts at page 1
        return next
      })
    }, 350)
  }, [setParams])

  useEffect(() => () => clearTimeout(timer.current), [])

  const setCategory = (slug) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (slug) next.set('category', slug)
      else next.delete('category')
      next.delete('page')
      return next
    })
  }

  const goToPage = (nextPage) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(nextPage))
      return next
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const posts = data?.results || []
  // Only promote a featured article on the unfiltered first page. Inside a
  // filtered view it would sit above results it does not belong to.
  const isDefaultView = !category && !search && page === 1
  const featured = isDefaultView ? posts.find((p) => p.is_featured) : null
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 9)) : 1

  return (
    <main id="top" className="bl-page">
      <SEO
        title="Journal — Glaze | Designed to Disappear"
        description="Articles from Glaze on specifying aluminium windows and doors — thermal and acoustic performance, glazing, hardware, finishes and installation."
        path="/blog"
        /* ⚠ THE CANONICAL IS ALWAYS /blog, AND FILTERED VIEWS ARE noindex.
           Category, search and page live in the query string, so
           ?category=glazing&page=3 is the same page with a subset of the
           same articles. Indexed separately they compete with /blog and
           with each other for the same terms; pointed at /blog they
           consolidate. `path` is deliberately not `pathname + search`. */
        noindex={!isDefaultView}
        schema={graph([
          {
            '@type': 'Blog',
            '@id': `${absoluteUrl('/blog')}#blog`,
            name: 'The Glaze Journal',
            url: absoluteUrl('/blog'),
            inLanguage: 'en',
            publisher: { '@id': ORGANIZATION_ID },
          },
        ])}
      />
      <div className="bl-shell">
        <header className="bl-masthead">
          <h1 className="bl-title">
            Notes on glass, <em>aluminium and light.</em>
          </h1>
          <p className="bl-note">
            What we have learned specifying, fabricating and installing window systems —
            written for the architects, builders and owners who have to live with the decision.
          </p>

          {/* Rendered only once the count is known, so the line does not
              appear, then change, then settle as data arrives. */}
          {data && (
            <p className="bl-masthead__meta">
              <span>{data.count} {data.count === 1 ? 'article' : 'articles'}</span>
              {taxonomy.categories?.length > 0 && (
                <span>{taxonomy.categories.length} categories</span>
              )}
              <span>Written in-house</span>
            </p>
          )}
        </header>

        <div className="bl-filters">
          <button
            type="button"
            className="bl-filter"
            aria-pressed={!category}
            onClick={() => setCategory('')}
          >
            All
          </button>
          {taxonomy.categories?.map((item) => (
            <button
              key={item.slug}
              type="button"
              className="bl-filter"
              aria-pressed={category === item.slug}
              onClick={() => setCategory(item.slug)}
            >
              {item.name}
            </button>
          ))}
          <input
            type="search"
            className="bl-search bl-filters__search"
            placeholder="Search the journal…"
            value={searchDraft}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search articles"
          />
        </div>

        {loading && <ListingSkeleton />}

        {!loading && failed && (
          <div className="bl-empty">
            <p className="bl-empty__title">The journal is unavailable</p>
            <p>We could not reach the server. Please try again in a moment.</p>
          </div>
        )}

        {!loading && !failed && posts.length === 0 && (
          <div className="bl-empty">
            <p className="bl-empty__title">Nothing here yet</p>
            <p>
              {search || category
                ? 'No articles match that filter. Try a broader search.'
                : 'The first article is on its way.'}
            </p>
          </div>
        )}

        {!loading && !failed && featured && <FeaturedPost post={featured} />}

        {!loading && !failed && rest.length > 0 && (
          <div className="bl-grid">
            {rest.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {!loading && !failed && totalPages > 1 && (
          <nav className="bl-pager" aria-label="Pagination">
            <button type="button" onClick={() => goToPage(page - 1)} disabled={!data?.previous}>
              ← Previous
            </button>
            <span className="bl-pager__count">
              Page {page} of {totalPages}
            </span>
            <button type="button" onClick={() => goToPage(page + 1)} disabled={!data?.next}>
              Next →
            </button>
          </nav>
        )}
      </div>
    </main>
  )
}

function FeaturedPost({ post }) {
  const image = mediaUrl(post.featured_image)

  return (
    <Link to={`/blog/${post.slug}`} className="bl-feature">
      <div className="bl-feature__media">
        {image ? (
          /* The one image above the fold — eager, and flagged high priority
             so it is not queued behind the card images below it. */
          <img src={image} alt={post.image_alt || post.title} fetchPriority="high" />
        ) : (
          <div className="bl-feature__placeholder" aria-hidden="true">G</div>
        )}
        <span className="bl-feature__flag">Featured</span>
      </div>

      <div>
        <div className="bl-card__meta">
          {post.category && <span className="bl-card__cat">{post.category.name}</span>}
          <span>{formatDate(post.published_at)}</span>
          <span>{post.reading_time} min read</span>
        </div>
        <h2 className="bl-feature__title">{post.title}</h2>
        <p className="bl-feature__excerpt">{post.excerpt}</p>
        <span className="bl-card__more">Read the article →</span>
      </div>
    </Link>
  )
}

/** Placeholder grid that occupies the same space the real cards will. */
function ListingSkeleton() {
  return (
    <div className="bl-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="bl-card">
          <div className="bl-skeleton bl-skeleton--media" />
          <div className="bl-skeleton bl-skeleton--line is-short" />
          <div className="bl-skeleton bl-skeleton--line" />
          <div className="bl-skeleton bl-skeleton--line" />
        </div>
      ))}
    </div>
  )
}
