import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi } from '@/services/admin'
import { assetUrl } from '@/services/api'
import { useToast } from '@/components/admin/Toast'
import { Empty, Loading } from '@/components/admin/ui'
import Icon from '@/components/admin/Icon'
import { formatRelative } from '@/utils/format'
import { PageHead } from './AdminLayout'

/**
 * The catalogue index — every system, published or not.
 *
 * Unpaginated and unsorted-by-anything-but-order, deliberately. This is a
 * catalogue of seven, and its ORDER is editorial: it is the sequence the
 * carousel rings, the footer column lists and the cross-links follow. A table
 * that let you sort by "last updated" would be showing you a different order
 * from the one the site uses, which is the fastest way to reorder the
 * homepage by accident.
 *
 * Moving a system is therefore the arrows, not a sort header — and each one
 * is a PATCH of two rows, which is why it saves immediately rather than
 * collecting changes behind a Save button.
 */
export default function Systems() {
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const load = useCallback((signal) => {
    setState('loading')
    return adminApi
      .listSystems(signal)
      .then((data) => {
        setItems(data)
        setState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('failed')
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  /**
   * Swap two systems' `order` values.
   *
   * Two PATCHes rather than a reorder endpoint: unlike a variant rail, which
   * renumbers every row when one moves, a system list only ever swaps a pair,
   * and the pair is small enough that the extra endpoint would be more
   * surface than it saves.
   */
  const move = async (index, by) => {
    const target = index + by
    if (target < 0 || target >= items.length || busy) return

    const a = items[index]
    const b = items[target]
    setBusy(true)
    try {
      await adminApi.updateSystem(a.slug, { order: b.order })
      await adminApi.updateSystem(b.slug, { order: a.order })
      await load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const togglePublished = async (system) => {
    try {
      await adminApi.updateSystem(system.slug, { is_published: !system.is_published })
      toast.success(
        system.is_published
          ? `${system.name} is hidden from the site.`
          : `${system.name} is live.`,
      )
      await load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const remove = async (system) => {
    if (!window.confirm(
      `Delete the ${system.name} system?\n\n` +
      `Its ${system.variant_count} variant(s) go with it, and /products/${system.slug} ` +
      'stops existing — any link to it will land on the first system instead.\n\n' +
      'To take it off the site without losing it, use Hide.',
    )) return

    try {
      await adminApi.deleteSystem(system.slug)
      toast.success(`${system.name} deleted.`)
      await load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <PageHead
        title="Systems"
        subtitle="The product catalogue — every system, and the variants each is built in"
      >
        <button
          type="button"
          className="ad-btn ad-btn--primary"
          onClick={() => navigate('/admin/systems/new')}
        >
          <Icon name="plus" size={13} /> New system
        </button>
      </PageHead>

      {state === 'loading' && <Loading rows={6} />}
      {state === 'failed' && <Empty title="Could not load the catalogue" />}
      {state === 'ready' && items.length === 0 && (
        <Empty title="No systems yet">
          The site falls back to the seven it shipped with until there is one
          here. Create the first, or run <code>manage.py seed_catalogue</code>
          {' '}to import them all.
        </Empty>
      )}

      {state === 'ready' && items.length > 0 && (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">System</th>
                <th scope="col" className="ad-table__num">Variants</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col"><span className="ad-table__actions">Order</span></th>
                <th scope="col"><span className="ad-table__actions">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((system, index) => (
                <tr key={system.slug}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                      {(system.card_poster_url || system.card_image_url) && (
                        <img
                          src={assetUrl(system.card_poster_url || system.card_image_url)}
                          alt=""
                          style={{
                            width: '38px', height: '38px', borderRadius: '3px',
                            objectFit: 'cover', flex: 'none',
                          }}
                        />
                      )}
                      <span>
                        <Link className="ad-table__title" to={`/admin/systems/${system.slug}`}>
                          {system.name}
                        </Link>
                        <p className="ad-table__sub">/products/{system.slug}</p>
                      </span>
                    </span>
                  </td>
                  <td className="ad-table__num">{system.variant_count}</td>
                  <td>
                    <span className={`ad-pill ad-pill--${system.is_published ? 'published' : 'archived'}`}>
                      {system.is_published ? 'Live' : 'Hidden'}
                    </span>
                  </td>
                  <td>{formatRelative(system.updated_at)}</td>
                  <td>
                    <div className="ad-table__actions">
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm ad-btn--ghost"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || busy}
                        aria-label={`Move ${system.name} earlier`}
                      >
                        <Icon name="arrowUp" size={12} />
                      </button>
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm ad-btn--ghost"
                        onClick={() => move(index, 1)}
                        disabled={index === items.length - 1 || busy}
                        aria-label={`Move ${system.name} later`}
                      >
                        <Icon name="arrowDown" size={12} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="ad-table__actions">
                      <Link
                        className="ad-btn ad-btn--sm ad-btn--ghost"
                        to={`/admin/systems/${system.slug}`}
                        aria-label={`Edit ${system.name}`}
                      >
                        <Icon name="edit" size={13} />
                      </Link>
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm ad-btn--ghost"
                        onClick={() => togglePublished(system)}
                        aria-label={system.is_published ? `Hide ${system.name}` : `Publish ${system.name}`}
                      >
                        <Icon name={system.is_published ? 'x' : 'check'} size={13} />
                      </button>
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm ad-btn--danger"
                        onClick={() => remove(system)}
                        aria-label={`Delete ${system.name}`}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
