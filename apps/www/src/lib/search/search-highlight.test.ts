import assert from 'node:assert/strict';
import {test} from 'node:test';

import {highlightParts} from './search-highlight';

/** The title with matches in [brackets]. */
const marked = (text: string, query: string | undefined) =>
    highlightParts(text, query)
        .map((p) => (p.match ? `[${p.text}]` : p.text))
        .join('');

test('a standalone 1 and & are bolded (PROD-3149)', () => {
    assert.equal(marked('1 Color Print', '1 color print'), '[1] [Color] [Print]');
    assert.equal(marked('Black & White Box', 'black & white'), '[Black] [&] [White] Box');
    assert.equal(marked('Tray & Sleeve, 1 Piece', 'tray & sleeve 1'), '[Tray] [&] [Sleeve], [1] Piece');
});

test('a 1-character word is not bolded inside another word or number', () => {
    assert.equal(marked('COR-010 Mailer', 'cor 1'), '[COR]-010 Mailer');
    assert.equal(marked('Banana Box', 'a box'), 'Banana [Box]');
    assert.equal(marked('B&W Insert', '& insert'), 'B&W [Insert]');
});

test('2+ character words still match anywhere, case-insensitive', () => {
    assert.equal(marked('Kraft Mailer Box', 'mail'), 'Kraft [Mail]er Box');
    assert.equal(marked('COR-054-BR1', 'cor-054'), '[COR-054]-BR1');
    assert.equal(marked('Box 10 Pack', '10 1'), 'Box [10] Pack');
});

test('regex characters in the query are literal', () => {
    assert.equal(marked('Box (Large) + Lid', '(large) +'), 'Box [(Large)] [+] Lid');
});

test('no query, or nothing matching: the title as one plain part', () => {
    assert.deepEqual(highlightParts('Kraft Box', undefined), [{text: 'Kraft Box', match: false}]);
    assert.deepEqual(highlightParts('Kraft Box', 'zzz'), [{text: 'Kraft Box', match: false}]);
});
