import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  isCatalogTargetVisible,
  isCustomerFacingVisible,
  isLineStyleVisible,
  isListedCatalogStatus,
} from './catalog-visibility.ts';

describe('catalog visibility predicates', () => {
  it('treats unset customerFacing as visible', () => {
    assert.equal(isCustomerFacingVisible(undefined), true);
    assert.equal(isCustomerFacingVisible(null), true);
    assert.equal(isCustomerFacingVisible(true), true);
    assert.equal(isCustomerFacingVisible(false), false);
  });

  it('lists active and coming-soon; hides discontinued', () => {
    assert.equal(isListedCatalogStatus(undefined), true);
    assert.equal(isListedCatalogStatus('coming-soon'), true);
    assert.equal(isListedCatalogStatus('discontinued'), false);
  });

  it('hides coming-soon lines and styles', () => {
    assert.equal(isLineStyleVisible('coming-soon', true), false);
    assert.equal(isLineStyleVisible('active', false), false);
    assert.equal(isLineStyleVisible(undefined, undefined), true);
  });
});

describe('isCatalogTargetVisible', () => {
  it('gates product lines and styles like LINE_STYLE_VISIBLE', () => {
    assert.equal(
      isCatalogTargetVisible({_type: 'productLine', status: 'coming-soon'}),
      false,
    );
    assert.equal(
      isCatalogTargetVisible({_type: 'productStyle', status: 'active'}),
      true,
    );
  });

  it('lists coming-soon products and bundles; hides discontinued', () => {
    assert.equal(
      isCatalogTargetVisible({_type: 'product', status: 'coming-soon'}),
      true,
    );
    assert.equal(
      isCatalogTargetVisible({_type: 'bundle', status: 'discontinued'}),
      false,
    );
  });

  it('requires page-bearing appearsIn for customization options; hasPage for expertise services', () => {
    assert.equal(
      isCatalogTargetVisible({
        _type: 'customizationOption',
        appearsIn: 'configurable-with-page',
        status: 'coming-soon',
      }),
      true,
    );
    assert.equal(
      isCatalogTargetVisible({
        _type: 'customizationOption',
        appearsIn: 'not-configurable-with-page',
        status: 'active',
      }),
      true,
    );
    assert.equal(
      isCatalogTargetVisible({
        _type: 'customizationOption',
        appearsIn: 'configurable-no-page',
        status: 'active',
      }),
      false,
    );
    assert.equal(
      isCatalogTargetVisible({
        _type: 'customizationOption',
        hasPage: true,
        status: 'active',
      }),
      false,
    );
    assert.equal(
      isCatalogTargetVisible({
        _type: 'expertiseService',
        hasPage: false,
        status: 'active',
      }),
      false,
    );
    assert.equal(
      isCatalogTargetVisible({
        _type: 'expertiseService',
        hasPage: true,
        status: 'active',
      }),
      true,
    );
  });

  it('lists coming-soon expertise stages; requires hasPage on solutions', () => {
    assert.equal(
      isCatalogTargetVisible({_type: 'expertiseStage', status: 'coming-soon'}),
      true,
    );
    assert.equal(
      isCatalogTargetVisible({_type: 'expertiseStage', status: 'discontinued'}),
      false,
    );
    assert.equal(
      isCatalogTargetVisible({_type: 'solution', hasPage: true}),
      true,
    );
    assert.equal(
      isCatalogTargetVisible({_type: 'solution', hasPage: false}),
      false,
    );
  });

  it('passes through unknown types', () => {
    assert.equal(isCatalogTargetVisible({_type: 'post'}), true);
    assert.equal(isCatalogTargetVisible(null), true);
  });
});
