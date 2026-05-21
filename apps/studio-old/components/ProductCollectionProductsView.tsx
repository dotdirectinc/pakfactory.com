import {useEffect, useMemo, useState} from 'react';
import {getPublishedId, useDocumentStore} from 'sanity';
import type {UserViewComponent} from 'sanity/structure';
import {IntentLink} from 'sanity/router';
import {PRODUCTS_FOR_COLLECTION_ID_QUERY} from '@pakfactory/sanity/queries';
import {LIST_THUMB_SIZE, sizedCdnThumb} from './listThumbnails';

type ProductRow = {
  _id: string;
  title: string | null;
  handle: string | null;
  pageSlug: string | null;
  thumbUrl: string | null;
  thumbAlt: string | null;
};

export const ProductCollectionProductsView: UserViewComponent = ({documentId}) => {
  const documentStore = useDocumentStore();
  const collectionId = useMemo(() => getPublishedId(documentId), [documentId]);
  const [rows, setRows] = useState<ProductRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setRows(null);
    setError(null);
    const sub = documentStore
      .listenQuery(
        PRODUCTS_FOR_COLLECTION_ID_QUERY,
        {collectionId},
        {
          tag: 'product-collection-products',
          throttleTime: 300,
          transitions: ['update', 'appear', 'disappear'],
        },
      )
      .subscribe({
        next: (res: unknown) => {
          setRows(Array.isArray(res) ? (res as ProductRow[]) : []);
          setError(null);
        },
        error: (err: unknown) => {
          setError(err instanceof Error ? err : new Error(String(err)));
        },
      });
    return () => sub.unsubscribe();
  }, [documentStore, collectionId]);

  if (error) {
    return (
      <div style={{padding: '1rem'}}>
        <div style={{color: 'crimson'}}>{error.message}</div>
      </div>
    );
  }

  if (rows === null) {
    return (
      <div style={{padding: '1rem'}}>
        <div>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{padding: '1rem'}}>
      {rows.length === 0 ? (
        <div style={{opacity: 0.75}}>No products reference this collection yet.</div>
      ) : (
        <ul style={{listStyle: 'none', margin: 0, padding: 0}}>
          {rows.map((row) => {
            const thumbSrc = sizedCdnThumb(row.thumbUrl);
            return (
              <li
                key={row._id}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  padding: '0.75rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: LIST_THUMB_SIZE,
                    height: LIST_THUMB_SIZE,
                    flexShrink: 0,
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: 'var(--card-muted-bg-color, rgba(255,255,255,0.06))',
                  }}
                >
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt={row.thumbAlt || ''}
                      width={LIST_THUMB_SIZE}
                      height={LIST_THUMB_SIZE}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div style={{minWidth: 0}}>
                  <IntentLink
                    intent="edit"
                    params={{id: row._id, type: 'product'}}
                    style={{color: 'inherit', textDecoration: 'none', fontWeight: 600}}
                  >
                    {row.title || 'Untitled'}
                  </IntentLink>
                  <div style={{fontSize: 12, opacity: 0.75, marginTop: 4}}>
                    {[row.pageSlug, row.handle].filter(Boolean).join(' · ') || row.handle || row._id}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
