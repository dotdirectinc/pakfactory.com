import assert from 'node:assert/strict'
import {describe, it} from 'node:test'

import {parentLocked, rulesLocked, setSpecOwner} from './spec-owned'

const ctx = (entityId?: string) => ({document: entityId === undefined ? {_id: 'x', _type: 'product'} : {_id: 'x', _type: 'product', entityId}}) as never

describe('spec-owned (PROD-2988 / PROD-3008)', () => {
  it('no marker: Studio owns everything — nothing is locked', () => {
    setSpecOwner(null)
    assert.equal(rulesLocked(), false)
    assert.equal(parentLocked(ctx('prd_01abc')), false)
  })

  it('Spec System owns rules only', () => {
    setSpecOwner({rules: 'spec', structure: 'studio'})
    assert.equal(rulesLocked(), true)
    assert.equal(parentLocked(ctx('prd_01abc')), false)
  })

  it('Spec System owns structure: only a registered record is locked', () => {
    setSpecOwner({rules: 'studio', structure: 'spec'})
    assert.equal(rulesLocked(), false)
    assert.equal(parentLocked(ctx('prd_01abc')), true)
    assert.equal(parentLocked(ctx()), false)
    assert.equal(parentLocked(ctx('')), false)
  })

  it('an unknown value is not "spec"', () => {
    setSpecOwner({rules: 'both', structure: true})
    assert.equal(rulesLocked(), false)
    assert.equal(parentLocked(ctx('prd_01abc')), false)
  })
})
