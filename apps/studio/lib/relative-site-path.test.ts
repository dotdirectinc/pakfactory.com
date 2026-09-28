import assert from 'node:assert/strict'
import {describe, it} from 'node:test'

import {validateRelativeSitePath} from './relative-site-path'

describe('validateRelativeSitePath', () => {
  it('passes when not required', () => {
    assert.equal(validateRelativeSitePath(undefined, {required: false}), true)
    assert.equal(validateRelativeSitePath('', {required: false}), true)
  })

  it('requires a value when required', () => {
    assert.equal(
      validateRelativeSitePath('', {required: true}),
      'Site path is required.',
    )
  })

  it('rejects domains', () => {
    assert.equal(
      validateRelativeSitePath('https://pakfactory.com/products', {
        required: true,
      }),
      'Do not include a domain. Use a path like /products.',
    )
  })

  it('requires a leading slash', () => {
    assert.equal(
      validateRelativeSitePath('products', {required: true}),
      'Path must start with / (e.g. /products).',
    )
  })

  it('accepts a root-relative path', () => {
    assert.equal(
      validateRelativeSitePath('/products', {required: true}),
      true,
    )
  })
})
