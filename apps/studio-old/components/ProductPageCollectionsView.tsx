import {useEffect, useMemo, useState} from 'react';
import {getPublishedId, useDocumentStore} from 'sanity';
import type {UserViewComponent} from 'sanity/structure';
import {IntentLink} from 'sanity/router';
import {mergeManualAndExtraCollections} from '@pakfactory/sanity/product-page-collections';
import {
  PRODUCT_COLLECTIONS_FROM_PRODUCTS_FOR_PAGE_ID_QUERY,
  PRODUCT_PAGE_STUDIO_COLLECTIONS_PANEL_QUERY,
} from '@pakfactory/sanity/queries';
import {LIST_THUMB_SIZE, sizedCdnThumb} from './listThumbnails';

type CollectionRow = {
  _id: string;
  title: string | null;
  slug: string | null;
  thumbUrl?: string | null;
  thumbAlt?: string | null;
};

type PanelSlice = {
  includeCollectionsFromProducts: boolean | null;
  manualCollections: CollectionRow[] | null;
};

export const ProductPageCollectionsView: UserViewComponent = ({documentId}) => {
  const documentStore = useDocumentStore();
  const pageId = useMemo(() => getPublishedId(documentId), [documentId]);
  const [panel, setPanel] = useState<PanelSlice | null>(null);
  const [fromProducts, setFromProducts] = useState<CollectionRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setPanel(null);
    setFromProducts(null);
    setError(null);

    const subPanel = documentStore
      .listenQuery(
        PRODUCT_PAGE_STUDIO_COLLECTIONS_PANEL_QUERY,
        {docId: documentId},
        {
          tag: 'product-page-collections-panel',
          throttleTime: 300,
          transitions: ['update', 'appear', 'disappear'],
        },
      )
      .subscribe({
        next: (res: unknown) => {
          const p = res as PanelSlice | null;
          setPanel(
            p ?? {
              includeCollectionsFromProducts: false,
              manualCollections: [],
            },
          );
        },
        error: (err: unknown) => {
          setError(err instanceof Error ? err : new Error(String(err)));
        },
      });

    const subProducts = documentStore
      .listenQuery(
        PRODUCT_COLLECTIONS_FROM_PRODUCTS_FOR_PAGE_ID_QUERY,
        {pageId},
        {
          tag: 'product-page-collections-from-products',
          throttleTime: 300,
          transitions: ['update', 'appear', 'disappear'],
        },
      )
      .subscribe({
        next: (res: unknown) => {
          setFromProducts(Array.isArray(res) ? (res as CollectionRow[]) : []);
        },
        error: (err: unknown) => {
          setError(err instanceof Error ? err : new Error(String(err)));
        },
      });

    return () => {
      subPanel.unsubscribe();
      subProducts.unsubscribe();
    };
  }, [documentStore, documentId, pageId]);

  const rows = useMemo(() => {
    if (panel === null || fromProducts === null) {
      return null;
    }
    const manual = (panel.manualCollections ?? []).filter((c): c is CollectionRow =>
      Boolean(c?._id),
    );
    if (!panel.includeCollectionsFromProducts) {
      return manual;
    }
    return mergeManualAndExtraCollections(manual, fromProducts);
  }, [panel, fromProducts]);

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
        <div style={{opacity: 0.75}}>
          No collections yet. Add related collections on the form, or turn on &quot;Also include collections from
          products on this page&quot; after products reference this landing page.
        </div>
      ) : (
        <ul style={{listStyle: 'none', margin: 0, padding: 0}}>
          {rows.map((row) => {
            const thumbSrc = sizedCdnThumb(row.thumbUrl ?? null);
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
                    params={{id: row._id, type: 'productCollection'}}
                    style={{color: 'inherit', textDecoration: 'none', fontWeight: 600}}
                  >
                    {row.title || 'Untitled'}
                  </IntentLink>
                  {row.slug ? (
                    <div style={{fontSize: 12, opacity: 0.75, marginTop: 4}}>/{row.slug}</div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
