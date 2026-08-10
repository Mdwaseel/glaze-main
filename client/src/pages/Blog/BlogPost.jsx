import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import SEO, { ORGANIZATION_ID, absoluteUrl, breadcrumbSchema, graph } from '@/components/common/SEO'
import Breadcrumbs from '@/components/common/Breadcrumbs'
import { Link, useParams } from 'react-router-dom'
import { ROUTES, blogPath } from '@/constants/routes'
import { blogApi } from '@/services/blog'
import { mediaUrl } from '@/services/api'
import { formatDate, initials } from '@/utils/format'
import PostCard from './PostCard'
import CommentThread from './CommentThread'
import '@/styles/blog.css'

/**
 * Reading progress bar.
 *
 * Writes a 0–1 scale factor to a CSS custom property and lets CSS do the
 * transform. That keeps the scroll handler to a single style write with no
 * layout read, which is what stops it becoming the jankiest thing on the
 * page — the classic version of this reads offsetHeight on every scroll
 * event and forces a synchronous reflow each time.
 *
 * The listener is passive (it never calls preventDefault) so the browser can
 * keep scrolling on the compositor while it runs.
 */
function ReadingProgress() {
  const barRef = useRef(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return undefined

    let frame = 0
    const update = () => {
      frame = 0
      // documentElement, not body — body's scrollHeight is unreliable when
      // the page uses margin collapsing, which the article column does.
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      const ratio = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0
      bar.style.setProperty('--bl-progress', String(ratio))
    }

    // rAF-coalesced: scroll fires far more often than the screen refreshes,
    // and one write per frame is all that can possibly be seen.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return <div ref={barRef} className="bl-progress" aria-hidden="true" />
}

/**
 * A single article — /blog/:slug
 *
 * About dangerouslySetInnerHTML on `post.content`: the brief requires the
 * editor to accept raw HTML, so the article body has to be injected rather
 * than escaped. The safety boundary is on the server — blog/sanitize.py runs
 * an allowlist (nh3) in Post.save(), so what arrives here has already had
 * script, style, iframe, form, event handlers and javascript:/data: URLs
 * removed. Sanitising on write rather than on read means this component
 * cannot forget to do it, and neither can any future consumer of the field.
 */
export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [state, setState] = useState('loading')
  const bodyRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    setPost(null)

    blogApi
      .getPost(slug, controller.signal)
      .then((data) => {
        setPost(data)
        setState('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState(error.status === 404 ? 'missing' : 'failed')
      })

    return () => controller.abort()
  }, [slug])

  /* The title and description were set by hand here, mutating the static
     <meta> in place and restoring it on unmount. <SEO> below owns them now,
     along with the canonical, the Open Graph pair, the breadcrumb and the
     BlogPosting schema this article had none of. */

  /**
   * Wrap any table the author wrote in a horizontally scrollable box.
   *
   * A wide table inside the article column would otherwise push the whole
   * document sideways on a phone, which is the layout failure the responsive
   * rules single out. Done here rather than in CSS because the wrapper has to
   * be a real element around the table, and the markup comes from the server.
   *
   * useLayoutEffect so the wrap happens before paint — as a passive effect
   * the reader would see one frame of the unwrapped, overflowing table.
   */
  useLayoutEffect(() => {
    const root = bodyRef.current
    if (!root) return

    root.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('bl-table-wrap')) return
      const wrap = document.createElement('div')
      wrap.className = 'bl-table-wrap'
      // Scrollable regions need to be keyboard-reachable, or someone who
      // cannot use a pointer has no way to scroll the table.
      wrap.tabIndex = 0
      wrap.setAttribute('role', 'region')
      wrap.setAttribute('aria-label', table.caption?.textContent || 'Table')
      table.parentNode.insertBefore(wrap, table)
      wrap.appendChild(table)
    })
  }, [post])

  if (state === 'loading') {
    return (
      <main className="bl-page">
        <div className="bl-shell bl-shell--narrow" aria-busy="true">
          <div className="bl-skeleton bl-skeleton--line is-short" />
          <div className="bl-skeleton bl-skeleton--media" style={{ marginTop: '1.5rem' }} />
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="bl-skeleton bl-skeleton--line" />
          ))}
        </div>
      </main>
    )
  }

  if (state !== 'ready') {
    return (
      <main className="bl-page">
        <div className="bl-shell bl-empty">
          <p className="bl-empty__title">
            {state === 'missing' ? 'Article not found' : 'Could not load this article'}
          </p>
          <p>
            {state === 'missing'
              ? 'It may have been moved or unpublished.'
              : 'We could not reach the server. Please try again in a moment.'}
          </p>
          <p style={{ marginTop: '1.5rem' }}>
            <Link to="/blog" className="bl-card__more">← Back to the journal</Link>
          </p>
        </div>
      </main>
    )
  }

  const hero = mediaUrl(post.featured_image)
  const author = post.show_author ? post.author : null

  // One array, two consumers: the visible trail and the BreadcrumbList.
  const trail = [
    { name: 'Home', path: ROUTES.HOME },
    { name: 'Journal', path: ROUTES.BLOG },
    { name: post.title, path: blogPath(post.slug) },
  ]

  return (
    <main id="top" className="bl-page">
      <SEO
        title={`${post.meta_title || post.title} — Glaze`}
        description={post.meta_description || post.excerpt}
        path={`/blog/${post.slug}`}
        type="article"
        image={hero || undefined}
        /* The author's own canonical wins when they set one — that is what
           the field is for: an article syndicated from elsewhere must point
           at the original, not at this copy. */
        {...(post.canonical_url ? { path: post.canonical_url } : {})}
        noindex={Boolean(post.noindex)}
        schema={graph([
          {
            '@type': 'BlogPosting',
            '@id': `${absoluteUrl(`/blog/${post.slug}`)}#article`,
            headline: (post.meta_title || post.title).slice(0, 110),
            description: post.meta_description || post.excerpt,
            image: hero ? [absoluteUrl(hero)] : undefined,
            datePublished: post.published_at,
            dateModified: post.updated_at || post.published_at,
            mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
            articleSection: post.category?.name,
            keywords: (post.tags || []).map((tag) => tag.name || tag).join(', ') || undefined,
            // ISO 8601 duration. The model stores minutes and computes them
            // from the body on save, so this is the same number the page
            // prints under the headline rather than a second estimate.
            timeRequired: post.reading_time ? `PT${post.reading_time}M` : undefined,
            inLanguage: 'en',
            publisher: { '@id': ORGANIZATION_ID },
            author: author
              ? {
                  '@type': 'Person',
                  name: author.name,
                  jobTitle: author.role || undefined,
                  worksFor: { '@id': ORGANIZATION_ID },
                }
              /* No byline shown on the page → the organisation is the
                 author. Naming a Person the reader cannot see would be
                 schema that does not match the visible content. */
              : { '@id': ORGANIZATION_ID },
          },
          breadcrumbSchema(trail),
        ])}
      />
      <ReadingProgress />
      <article>
        <div className="bl-shell">
          {/* ⚠ THIS REPLACES THE "← Journal" LINK, it does not sit beside it.
              The BreadcrumbList above has been in this page's JSON-LD since
              it was written, with nothing on the page matching it — and a
              single back-link is not a trail: it names one ancestor and
              omits the root the schema claims. One trail, built once, used
              in both places. */}
          <Breadcrumbs trail={trail} className="bl-crumbs" />

          <header className="bl-article__head">
            <p className="bl-eyebrow" style={{ justifyContent: 'center' }}>
              {post.category?.name || 'Journal'}
            </p>
            <h1 className="bl-article__title">{post.title}</h1>
            <div className="bl-article__meta">
              {author && <span>{author.name}</span>}
              <span>{formatDate(post.published_at)}</span>
              <span>{post.reading_time} min read</span>
            </div>
          </header>

          {hero && (
            <figure className="bl-article__hero">
              <img src={hero} alt={post.image_alt || post.title} fetchPriority="high" />
            </figure>
          )}
        </div>

        <div className="bl-shell bl-shell--narrow">
          {post.takeaway_list?.length > 0 && (
            <aside className="bl-takeaways" aria-labelledby="bl-takeaways-title">
              <p className="bl-takeaways__title" id="bl-takeaways-title">Key takeaways</p>
              <ul>
                {post.takeaway_list.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </aside>
          )}

          {/* See the component docstring: sanitised server-side on write. */}
          <div
            ref={bodyRef}
            className="bl-body"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.tags?.length > 0 && (
            <div className="bl-tags">
              {post.tags.map((tag) => (
                <Link key={tag.slug} to={`/blog?search=${encodeURIComponent(tag.name)}`} className="bl-tag">
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          {author && (
            <aside className="bl-byline">
              {author.avatar ? (
                <img className="bl-byline__avatar" src={mediaUrl(author.avatar)} alt="" />
              ) : (
                <div className="bl-byline__avatar bl-byline__initials" aria-hidden="true">
                  {initials(author.name)}
                </div>
              )}
              <div>
                <p className="bl-byline__name">{author.name}</p>
                {author.role && <p className="bl-byline__role">{author.role}</p>}
                {author.bio && <p className="bl-byline__bio">{author.bio}</p>}
              </div>
            </aside>
          )}

          <CommentThread slug={post.slug} enabled={post.comments_enabled} />
        </div>

        {post.related?.length > 0 && (
          <div className="bl-shell">
            <section className="bl-related" aria-labelledby="bl-related-title">
              <p className="bl-eyebrow" id="bl-related-title">Read next</p>
              <div className="bl-grid">
                {post.related.map((item) => (
                  <PostCard key={item.id} post={item} />
                ))}
              </div>
            </section>
          </div>
        )}
      </article>
    </main>
  )
}
