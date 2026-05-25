import {useEffect, useMemo, useState} from 'react';
import {getPublishedId, useDocumentStore} from 'sanity';
import type {UserViewComponent} from 'sanity/structure';
import {IntentLink} from 'sanity/router';

type CapabilityRow = {
  _id: string;
  title: string | null;
  slug: string | null;
  category: 'material' | 'finish' | null;
};

const CATEGORY_LABEL: Record<NonNullable<CapabilityRow['category']>, string> = {
  material: 'Materials',
  finish: 'Finishes',
};

const PRODUCT_REFS_QUERY = `
*[_type == "product" && _id == $docId][0]{
  "landingPageId": primaryLandingPage._ref,
  "collectionId": primaryCollection._ref
}
`;

const CAPABILITIES_QUERY = `
*[
  _type == "capabilityCategory" &&
  (
    ($landingPageId != null && $landingPageId in landingPages[]._ref) ||
    ($collectionId != null && $collectionId in collections[]._ref)
  )
]{
  _id,
  title,
  "slug": slug.current,
  category
}
`;

export const ProductCapabilitiesView: UserViewComponent = ({documentId}) => {
  const documentStore = useDocumentStore();
  const docId = useMemo(() => getPublishedId(documentId), [documentId]);
  const [rows, setRows] = useState<CapabilityRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const [refs, setRefs] = useState<{
    landingPageId: string | null;
    collectionId: string | null;
  } | null>(null);

  useEffect(() => {
    setRefs(null);
    setError(null);
    const sub = documentStore
      .listenQuery(
        PRODUCT_REFS_QUERY,
        {docId},
        {
          tag: 'product-capabilities-refs',
          throttleTime: 300,
          transitions: ['update', 'appear', 'disappear'],
        },
      )
      .subscribe({
        next: (res: unknown) => {
          const r = res as {
            landingPageId?: string | null;
            collectionId?: string | null;
          } | null;
          setRefs({
            landingPageId: r?.landingPageId ?? null,
            collectionId: r?.collectionId ?? null,
          });
        },
        error: (err: unknown) => {
          setError(err instanceof Error ? err : new Error(String(err)));
        },
      });
    return () => sub.unsubscribe();
  }, [documentStore, docId]);

  useEffect(() => {
    if (!refs) return;
    if (!refs.landingPageId && !refs.collectionId) {
      setRows([]);
      return;
    }
    setRows(null);
    const params = {
      ...(refs.landingPageId ? {landingPageId: refs.landingPageId} : {}),
      ...(refs.collectionId ? {collectionId: refs.collectionId} : {}),
    };
    const sub = documentStore
      .listenQuery(
        CAPABILITIES_QUERY,
        params,
        {
          tag: 'product-capabilities',
          throttleTime: 300,
          transitions: ['update', 'appear', 'disappear'],
        },
      )
      .subscribe({
        next: (res: unknown) => {
          setRows(Array.isArray(res) ? (res as CapabilityRow[]) : []);
        },
        error: (err: unknown) => {
          setError(err instanceof Error ? err : new Error(String(err)));
        },
      });
    return () => sub.unsubscribe();
  }, [documentStore, refs]);

  const grouped = useMemo(() => {
    if (!rows) return null;
    const map = new Map<string, CapabilityRow[]>();
    for (const row of rows) {
      const key = row.category ?? 'uncategorized';
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [rows]);

  if (error) {
    return (
      <div style={{padding: '1rem', color: 'crimson'}}>{error.message}</div>
    );
  }

  if (!grouped) {
    return <div style={{padding: '1rem'}}>Loading…</div>;
  }

  if (grouped.size === 0) {
    return (
      <div style={{padding: '1rem', opacity: 0.75}}>
        No capabilities reference this product&rsquo;s landing page or
        collection yet.
      </div>
    );
  }

  return (
    <div style={{padding: '1rem'}}>
      {Array.from(grouped.entries()).map(([category, items]) => (
        <section key={category} style={{marginBottom: '1.5rem'}}>
          <h3
            style={{
              margin: '0 0 0.5rem',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              opacity: 0.7,
            }}
          >
            {CATEGORY_LABEL[category as 'material' | 'finish'] ?? category}
          </h3>
          <ul style={{listStyle: 'none', margin: 0, padding: 0}}>
            {items.map((row) => (
              <li
                key={row._id}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  padding: '0.5rem 0',
                }}
              >
                <IntentLink
                  intent="edit"
                  params={{id: row._id, type: 'capabilityCategory'}}
                  style={{
                    color: 'inherit',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  {row.title || 'Untitled'}
                </IntentLink>
                {row.slug ? (
                  <div style={{fontSize: 12, opacity: 0.7, marginTop: 2}}>
                    /{row.slug}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
