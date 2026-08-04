import { Link } from 'react-router-dom'
import { mediaUrl } from '@/services/api'
import { formatDate } from '@/utils/format'

/**
 * One article card. Shared by the listing grid and the "read next" rail.
 *
 * The whole card is a single <Link> rather than a div with a link inside it.
 * That gives one tab stop and one large hit target instead of a nested set,
 * which is both simpler for a keyboard user and what a person expects when
 * they click the image.
 */
export default function PostCard({ post }) {
  const image = mediaUrl(post.featured_image)

  return (
    <Link to={`/blog/${post.slug}`} className="bl-card">
      <div className="bl-card__media">
        {image ? (
          <img
            src={image}
            alt={post.image_alt || post.title}
            /* Cards are below the fold on every viewport, so none of them
               competes with the hero for the initial network budget. */
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="bl-card__placeholder" aria-hidden="true">G</div>
        )}
      </div>

      <div className="bl-card__meta">
        {post.category && <span className="bl-card__cat">{post.category.name}</span>}
        <span>{formatDate(post.published_at)}</span>
        <span>{post.reading_time} min</span>
      </div>

      <h3 className="bl-card__title">{post.title}</h3>
      <p className="bl-card__excerpt">{post.excerpt}</p>
      <span className="bl-card__more">Read →</span>
    </Link>
  )
}
