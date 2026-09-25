import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
  normalizeSitePath,
  resolveSectionLinkHref,
  resolveWwwNavHref,
} from './resolve-www-nav-href';

describe('normalizeSitePath', () => {
  it('keeps a root-relative path', () => {
    assert.equal(normalizeSitePath('/products'), '/products');
  });

  it('prefixes a missing leading slash', () => {
    assert.equal(normalizeSitePath('products'), '/products');
  });

  it('strips a domain to path + search + hash', () => {
    assert.equal(
      normalizeSitePath('https://pakfactory.com/products?x=1#top'),
      '/products?x=1#top',
    );
  });

  it('returns null for empty input', () => {
    assert.equal(normalizeSitePath(''), null);
    assert.equal(normalizeSitePath(null), null);
  });
});

describe('resolveWwwNavHref', () => {
  it('resolves linkType path to a root-relative href', () => {
    assert.deepEqual(
      resolveWwwNavHref({
        linkType: 'path',
        relativePath: '/products',
      }),
      {href: '/products', external: false},
    );
  });

  it('returns null when path is missing', () => {
    assert.equal(
      resolveWwwNavHref({
        linkType: 'path',
        relativePath: '   ',
      }),
      null,
    );
  });

  it('resolves external URLs', () => {
    assert.deepEqual(
      resolveWwwNavHref({
        linkType: 'external',
        externalUrl: 'https://example.com/about',
      }),
      {href: 'https://example.com/about', external: true},
    );
  });
});

describe('resolveSectionLinkHref', () => {
  it('resolves path the same way as resolveWwwNavHref', () => {
    assert.deepEqual(
      resolveSectionLinkHref({
        linkType: 'path',
        relativePath: '/customizations',
      }),
      resolveWwwNavHref({
        linkType: 'path',
        relativePath: '/customizations',
      }),
    );
  });
});
