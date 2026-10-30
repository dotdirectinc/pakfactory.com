/**
 * PROD-3200 — inspiration manufacturing specs fall back to basedOn when unset.
 */
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {evaluate, parse} from 'groq-js';
import {CATALOG_PRODUCT_FIELDS} from './catalog.ts';

const line = {
  _id: 'line',
  _type: 'productLine',
  title: 'Rigid Boxes',
  slug: {current: 'rigid-boxes'},
  status: 'active',
};
const style = {
  _id: 'style',
  _type: 'productStyle',
  title: 'Tuck End',
  slug: {current: 'tuck-end'},
  productLine: {_ref: 'line'},
  status: 'active',
};

const base = {
  _id: 'base',
  _type: 'product',
  kind: 'standard',
  title: 'Base Mailer',
  slug: {current: 'base-mailer'},
  sku: 'BASE-1',
  status: 'active',
  productLine: {_ref: 'line'},
  productStyle: [{_ref: 'style'}],
  moq: 1000,
  dimensionInput: 'cylinder',
  dimensionRange: {diameterMin: 40, diameterMax: 80, heightMin: 100, heightMax: 200},
  leadTimeBusinessDaysMin: 10,
  leadTimeBusinessDaysMax: 15,
  availableCustomizations: [],
};

async function project(productId: string, dataset: unknown[]) {
  const query = `*[_id == $id][0]{ ${CATALOG_PRODUCT_FIELDS} }`;
  return (await evaluate(parse(query), {dataset, params: {id: productId}})).get();
}

test('inspiration with blank specs falls back to basedOn', async () => {
  const inspiration = {
    _id: 'insp',
    _type: 'product',
    kind: 'inspiration',
    title: 'Candle Mailer',
    slug: {current: 'candle-mailer'},
    sku: 'INSP-1',
    status: 'active',
    basedOn: {_ref: 'base'},
    solutions: [{_ref: 'sol'}],
    availableCustomizations: [],
  };
  const row = (await project('insp', [line, style, base, inspiration])) as {
    moq?: number;
    dimensionInput?: string;
    dimensionRange?: {diameterMin?: number};
    leadTimeBusinessDaysMin?: number;
    leadTimeBusinessDaysMax?: number;
  };
  assert.equal(row.moq, 1000);
  assert.equal(row.dimensionInput, 'cylinder');
  assert.equal(row.dimensionRange?.diameterMin, 40);
  assert.equal(row.leadTimeBusinessDaysMin, 10);
  assert.equal(row.leadTimeBusinessDaysMax, 15);
});

test('inspiration own MOQ wins over basedOn', async () => {
  const inspiration = {
    _id: 'insp-own',
    _type: 'product',
    kind: 'inspiration',
    title: 'Override Mailer',
    slug: {current: 'override-mailer'},
    sku: 'INSP-2',
    status: 'active',
    basedOn: {_ref: 'base'},
    moq: 250,
    dimensionInput: 'rectangular',
    leadTimeBusinessDaysMin: 5,
    leadTimeBusinessDaysMax: 5,
    solutions: [{_ref: 'sol'}],
    availableCustomizations: [],
  };
  const row = (await project('insp-own', [line, style, base, inspiration])) as {
    moq?: number;
    dimensionInput?: string;
    leadTimeBusinessDaysMin?: number;
    leadTimeBusinessDaysMax?: number;
  };
  assert.equal(row.moq, 250);
  assert.equal(row.dimensionInput, 'rectangular');
  assert.equal(row.leadTimeBusinessDaysMin, 5);
  assert.equal(row.leadTimeBusinessDaysMax, 5);
});

test('standard product uses own specs (no basedOn)', async () => {
  const row = (await project('base', [line, style, base])) as {
    moq?: number;
    dimensionInput?: string;
    leadTimeBusinessDaysMin?: number;
  };
  assert.equal(row.moq, 1000);
  assert.equal(row.dimensionInput, 'cylinder');
  assert.equal(row.leadTimeBusinessDaysMin, 10);
});
