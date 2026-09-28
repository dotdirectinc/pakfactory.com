import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {orderExpertiseStages} from './expertise.ts';

describe('orderExpertiseStages', () => {
  const design = {_id: 'a', title: 'Design'};
  const strategy = {_id: 'b', title: 'Strategy'};
  const logistics = {_id: 'c', title: 'Logistics'};
  const all = [strategy, design, logistics];

  it('puts featured first in pin order, then remainder by title', () => {
    const ordered = orderExpertiseStages([logistics, design], all);
    assert.deepEqual(
      ordered.map((s) => s._id),
      ['c', 'a', 'b'],
    );
  });

  it('tolerates missing featured', () => {
    const ordered = orderExpertiseStages(null, all);
    assert.deepEqual(
      ordered.map((s) => s.title),
      ['Design', 'Logistics', 'Strategy'],
    );
  });

  it('ignores featured ids not in all', () => {
    const ordered = orderExpertiseStages(
      [{_id: 'missing', title: 'Gone'}, design],
      all,
    );
    assert.deepEqual(
      ordered.map((s) => s._id),
      ['a', 'c', 'b'],
    );
  });
});
