import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { galleryApi } from '@/services/gallery'
import { assetUrl } from '@/services/api'
import { useCatalogue } from '@/context/CatalogueContext'
import { productPath, ROUTES } from '@/constants/routes'
import './gallerySection.css'

/**
 * GallerySection — completed work, photographed and filmed.
 *
 * ⚠ IT IS THE FIRST SECTION ON THIS SITE WITH NO BUILD-TIME CONTENT AT ALL.
 * Everything else renders from the catalogue, which ships a full static
 * fallback in `data/systems.js`, so an unreachable backend still shows the
 * products. There is no fallback here and there deliberately is not one:
 * project photography does not exist until somebody uploads it, so an empty
 * gallery is a true statement about a new install rather than a failure. The
 * three states below are therefore all real states, not error handling —
 * loading, empty, and unreachable each say a different, accurate thing.
 *
 * ⚠ FILMS DO NOT AUTOPLAY. A grid of eight clips all playing at once is
 * eight video decoders, which on a mid-range phone is the page freezing. Each
 * tile is a poster until it is opened in the lightbox, or — on a pointer
 * device — hovered. Same arrangement as the system cross-links.
 *
 * ⚠ THE LIGHTBOX IS A NATIVE <dialog>. It brings its own focus trap, its own
 * Escape handling, its own inertness for the page behind it and its own top
 * layer, all of which a div-with-a-z-index has to reimplement and usually
 * gets wrong. Arrow keys move between items; the rest is the platform's.
 */

/* ⚠ assetUrl(), NOT mediaUrl(). The gallery holds both kinds of path, exactly
   as the catalogue does: `/media/gallery/…` is an upload served by Django and
   has to be resolved against the API origin, while `/images/projects/…` is a
   build asset in client/public that belongs to the site's own origin and
   would 404 if it were fetched from Django. assetUrl() is the helper that
   knows the difference; mediaUrl() would break every authored path. */
function resolve(path) {
  return assetUrl(path)
}

export default function GallerySection() {
  const [state, setState] = useState('loading') // loading | ready | error
  const [data, setData] = useState({ categories: [], items: [], total: 0, limit: 0 })
  const [filter, setFilter] = useState('all')
  const [openIndex, setOpenIndex] = useState(-1)

  const dialogRef = useRef(null)
  const { bySlug } = useCatalogue()

  useEffect(() => {
    const controller = new AbortController()
    galleryApi
      .get(controller.signal)
      .then((payload) => {
        setData({
          categories: payload.categories || [],
          items: payload.items || [],
          total: payload.total || 0,
          limit: payload.limit || 0,
        })
        setState('ready')
      })
      .catch((error) => {
        // An aborted request is the component unmounting, not a failure.
        if (error?.name === 'AbortError') return
        setState('error')
      })
    return () => controller.abort()
  }, [])

  /* Only the tabs that have something behind them. A filter that resolves to
     an empty grid is a control that looks broken, and the categories are
     editable — one can be published before anything is filed under it. */
  const tabs = useMemo(() => {
    const used = new Set(data.items.map((item) => item.category).filter(Boolean))
    return [
      { slug: 'all', name: 'All' },
      ...data.categories.filter((category) => used.has(category.slug)),
    ]
  }, [data])

  const visible = useMemo(
    () => (filter === 'all' ? data.items : data.items.filter((i) => i.category === filter)),
    [data.items, filter],
  )

  /* The lightbox indexes into the FILTERED list, so the arrows walk what the
     visitor can see rather than the whole set. Changing tab closes it — the
     index would otherwise point into a list that no longer exists. */
  const close = useCallback(() => setOpenIndex(-1), [])
  const step = useCallback(
    (delta) => {
      setOpenIndex((current) => {
        if (current < 0 || !visible.length) return current
        return (current + delta + visible.length) % visible.length
      })
    },
    [visible.length],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (openIndex >= 0 && !dialog.open) dialog.showModal()
    if (openIndex < 0 && dialog.open) dialog.close()
  }, [openIndex])

  useEffect(() => {
    if (openIndex < 0) return
    const onKey = (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openIndex, step])

  const active = openIndex >= 0 ? visible[openIndex] : null

  return (
    <section className="gal" id="gallery" aria-labelledby="gal-title">
      <div className="gal__inner">

        <header className="gal__head">
          <p className="gal__eyebrow">Gallery</p>
          <h2 className="gal__title" id="gal-title">
            The work,<br /><em>in the buildings.</em>
          </h2>
          <p className="gal__lede">
            Completed projects — photographed and filmed where they stand. A
            system in a showroom is a specification; a system in a wall is the
            only version that matters.
          </p>
        </header>

        {state === 'loading' && (
          <p className="gal__state" role="status">Loading the gallery&hellip;</p>
        )}

        {state === 'error' && (
          <p className="gal__state" role="status">
            The gallery could not be loaded just now. Everything else on the
            site is unaffected &mdash;{' '}
            <Link to={ROUTES.CONTACT}>ask us for project photography</Link> and
            we will send it directly.
          </p>
        )}

        {/* ⚠ A TRUE EMPTY STATE, not an error. On a fresh install there is
            simply nothing filed yet, and saying so is more honest than an
            empty grid or a spinner that never resolves. */}
        {state === 'ready' && !data.items.length && (
          <p className="gal__state" role="status">
            There is nothing in the gallery yet.{' '}
            <Link to={ROUTES.SYSTEMS}>The systems</Link> are all here, and{' '}
            <Link to={ROUTES.CONTACT}>we can send project photography</Link> on
            request.
          </p>
        )}

        {state === 'ready' && data.items.length > 0 && (
          <>
            {tabs.length > 1 && (
              <div className="gal__filters" role="group" aria-label="Filter the gallery">
                <div className="gal__filters-track">
                  {tabs.map((tab) => (
                    <button
                      type="button"
                      key={tab.slug}
                      className={tab.slug === filter ? 'gal__filter is-active' : 'gal__filter'}
                      aria-pressed={tab.slug === filter}
                      onClick={() => { setFilter(tab.slug); close() }}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ul className="gal__grid">
              {visible.map((item, i) => (
                <li
                  className={item.is_featured ? 'gal__cell gal__cell--wide' : 'gal__cell'}
                  key={item.id}
                >
                  <button
                    type="button"
                    className="gal__tile"
                    onClick={() => setOpenIndex(i)}
                    aria-label={`${item.title} — open`}
                  >
                    <span className="gal__media">
                      <Tile item={item} />
                      {item.kind === 'video' && (
                        <span className="gal__play" aria-hidden="true">
                          <svg viewBox="0 0 24 24"><polygon points="9,7 18,12 9,17" /></svg>
                        </span>
                      )}
                    </span>
                    <span className="gal__caption">
                      <span className="gal__caption-title">{item.title}</span>
                      {item.system && bySlug[item.system] && (
                        <span className="gal__caption-system">{bySlug[item.system].name}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {/* ⚠ THE CAP IS STATED, NOT HIDDEN. The API returns at most
                `limit` items; a grid that silently stops at 120 of 340 reads
                as "this is everything". */}
            {data.total > data.items.length && (
              <p className="gal__more">
                Showing the {data.items.length} most recent of {data.total}.{' '}
                <Link to={ROUTES.CONTACT}>Ask for the rest</Link>.
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────── */}
      <dialog
        className="gal__lightbox"
        ref={dialogRef}
        aria-label={active ? active.title : 'Gallery'}
        /* `close` fires for Escape and for the backdrop-driven close alike,
           so the component's state follows the element rather than trying to
           predict it. */
        onClose={close}
        onClick={(event) => {
          // The backdrop is the dialog element itself; a click that lands on
          // it rather than on the panel inside means "outside".
          if (event.target === dialogRef.current) close()
        }}
      >
        {active && (
          <div className="gal__lb-panel">
            <button type="button" className="gal__lb-close" onClick={close} aria-label="Close">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>

            <div className="gal__lb-media">
              {active.kind === 'video' ? (
                <video
                  key={active.id}
                  src={resolve(active.video)}
                  poster={resolve(active.poster) || undefined}
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <img key={active.id} src={resolve(active.image)} alt={active.alt} />
              )}
            </div>

            <div className="gal__lb-foot">
              <div className="gal__lb-copy">
                <p className="gal__lb-title">{active.title}</p>
                {active.caption && <p className="gal__lb-caption">{active.caption}</p>}
                {active.system && bySlug[active.system] && (
                  <Link className="gal__lb-link" to={productPath(active.system)} onClick={close}>
                    {bySlug[active.system].name} system<span aria-hidden="true"> &rarr;</span>
                  </Link>
                )}
              </div>

              {visible.length > 1 && (
                <div className="gal__lb-nav">
                  <button type="button" onClick={() => step(-1)} aria-label="Previous">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
                  </button>
                  <span className="gal__lb-count">
                    {openIndex + 1} / {visible.length}
                  </span>
                  <button type="button" onClick={() => step(1)} aria-label="Next">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </dialog>
    </section>
  )
}

/**
 * The tile's own media.
 *
 * A film shows its poster and plays only under a pointer — see the note at
 * the top about eight decoders on a phone. `preload="none"` means the clip is
 * not fetched at all until then.
 */
function Tile({ item }) {
  if (item.kind === 'video') {
    return (
      <video
        className="gal__media-el"
        src={resolve(item.video)}
        poster={resolve(item.poster) || undefined}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        onMouseEnter={(event) => {
          const video = event.currentTarget
          if (video.preload === 'none') { video.preload = 'auto'; video.load() }
          const played = video.play()
          if (played && played.catch) played.catch(() => {})
        }}
        onMouseLeave={(event) => event.currentTarget.pause()}
      />
    )
  }

  return (
    <img
      className="gal__media-el"
      src={resolve(item.image)}
      /* Never empty: the serialiser falls back to the title, so a
         photograph always arrives with a description. */
      alt={item.alt}
      loading="lazy"
      decoding="async"
    />
  )
}
