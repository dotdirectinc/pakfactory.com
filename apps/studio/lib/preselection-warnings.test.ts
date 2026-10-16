import assert from 'node:assert/strict'
import {describe, it} from 'node:test'

import {baseWarning, presetWarning, strayPreselections} from './preselection-warnings'

describe('strayPreselections', () => {
  it('lists the pre-selections the offer leaves out, once each, drafts read as published', () => {
    const offered = new Set(['matte', 'kraft'])
    assert.deepEqual(strayPreselections(offered, ['matte', 'drafts.gloss', 'gloss', null, 'foil']), ['gloss', 'foil'])
  })

  it('is empty when every pre-selection is offered', () => {
    assert.deepEqual(strayPreselections(new Set(['matte']), ['matte']), [])
  })
})

describe('presetWarning', () => {
  it('names the options and the base', () => {
    assert.equal(
      presetWarning(['Matte'], 'Mailer Box'),
      "Pre-selects Matte, which Mailer Box doesn't offer — the configurator can't start from it. Offer it on Mailer Box, or change the pre-selection here.",
    )
    assert.match(presetWarning(['Matte', 'Gloss', 'Foil'], 'Mailer Box'), /^Pre-selects Matte, Gloss and Foil, which .* from them\. .* pre-selections here\.$/)
  })
})

describe('baseWarning', () => {
  it('names each preset and its options', () => {
    assert.equal(
      baseWarning([{title: 'Gift Mailer', options: ['Matte']}]),
      "1 inspiration product pre-selects options this product doesn't offer: Gift Mailer (Matte). Offer them here, or change its pre-selections.",
    )
  })

  it('caps the list and counts the rest', () => {
    const rows = Array.from({length: 10}, (_, i) => ({title: `P${i}`, options: ['X']}))
    assert.match(baseWarning(rows, 2), /^10 inspiration products pre-select .*: P0 \(X\); P1 \(X\); and 8 more\. .* their pre-selections\.$/)
  })
})
