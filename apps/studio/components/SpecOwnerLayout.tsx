import { useEffect, useState, type CSSProperties } from 'react'
import { useClient, type LayoutProps } from 'sanity'
import { setSpecOwner, SPEC_OWNER_MARKER_ID } from '../lib/spec-owned'

/**
 * Loads who owns the catalog relations (the `specRelationsOwner` marker, PROD-2988 / PROD-3008) before
 * the Studio renders, so a rule or parent field is never briefly editable when it should not be, and
 * keeps listening: when an admin flips the switch, a banner asks editors to reload.
 *
 * A failed read leaves the fields editable (Studio's own state before the switch existed) rather than
 * blocking the Studio; the server's drift check still flags anything changed while that lasts.
 */

const QUERY = `*[_id == "${SPEC_OWNER_MARKER_ID}"][0]{ rules, structure }`

const BANNER: CSSProperties = {
  padding: '8px 16px',
  fontSize: 13,
  textAlign: 'center',
  background: 'var(--card-badge-caution-bg-color, #fff4d6)',
  color: 'var(--card-fg-color, inherit)',
}

export function SpecOwnerLayout(props: LayoutProps) {
  const client = useClient({ apiVersion: '2024-01-01' })
  const [ready, setReady] = useState(false)
  const [changed, setChanged] = useState(false)

  useEffect(() => {
    let alive = true
    client
      .fetch<{ rules?: string; structure?: string } | null>(QUERY)
      .then((m) => setSpecOwner(m))
      .catch(() => setSpecOwner(null))
      .finally(() => alive && setReady(true))
    const sub = client.listen(`*[_id == "${SPEC_OWNER_MARKER_ID}"]`).subscribe(() => alive && setChanged(true))
    return () => {
      alive = false
      sub.unsubscribe()
    }
  }, [client])

  if (!ready) return null
  return (
    <>
      {changed ? (
        <div style={BANNER}>
          Who edits customization rules and parents has just changed in the admin office.{' '}
          <a href="" onClick={() => window.location.reload()}>Reload Studio</a> to apply it.
        </div>
      ) : null}
      {props.renderDefault(props)}
    </>
  )
}
