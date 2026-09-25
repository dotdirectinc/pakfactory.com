/**
 * Geometry for the Signature system "cards become the framework" morph
 * (PROD-2577). Ported verbatim from the POC (`MorphFramework.jsx`) — the
 * numbers are the design: five problem cards in a stack, each of which bends,
 * turns and travels into one arc of the dial.
 *
 * All units are the 200×200 SVG viewBox. Pure functions — no DOM.
 */

/** Ring radius — the settled dial. */
export const RING_R = 76;
/** The morph is authored for exactly five problems ↔ five dimensions. */
export const MORPH_COUNT = 5;
/** Degrees of drawn arc per slot (18% of the circle). */
const SWEEP = (18 / 100) * 360;
/** Arc length of one slot ≈ 85.9. */
const ARC_LEN = (18 / 100) * 2 * Math.PI * RING_R;
const SAMPLES = 28;

export const BOX = 200;
const CX = 100;
const CY = 100;

/** Card at rest — long and thin, one line of label. */
export const CARD_LEN = 118;
export const CARD_H = 26;

/** Card centres at rest (a staggered stack). */
export const REST_X = [86, 122, 70, 130, 94] as const;
export const REST_Y = [18, 63, 103, 148, 186] as const;
/** Parallax depth per card — uneven, so the set never slides as one plane. */
export const DEPTH = [1, 0.55, 0.85, 0.4, 0.7] as const;

/** Sticky offset (`top-24`, 96px) and the bands' vertical padding (`lg:py-32`, 128px). */
export const STICKY_TOP = 96;
export const BAND_PAD = 128;

/** Scroll phases (fractions of the ScrollTrigger progress). They never overlap. */
export const TEXT_OUT: [number, number] = [0.02, 0.28];
export const SHAPE_MOVE: [number, number] = [0.32, 1];
export const NUMERALS_IN: [number, number] = [0.78, 1];

/** Corner radius as a fraction of half-width — the rest card's `rounded-2xl`. */
const CORNER = 0.47;

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const phase = (t: number, [a, b]: [number, number]) =>
    clamp01((t - a) / (b - a));

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Bearing of an arc's midpoint, degrees, 0 = 3 o'clock. */
const bearing = (i: number) => -90 + i * (360 / MORPH_COUNT) + SWEEP / 2;
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;
/** Rotation that lays a card onto its slot — wrapped so nothing spins the long way. */
const endRot = (i: number) => wrap(bearing(i) + 90);

/**
 * One band outline at morph progress `st` (0 = card, 1 = arc), nudged by the
 * parallax offset (`dx`, `dy`), `w` wide. `rest` is the card's slot in the
 * stack; `target` the arc (dimension index) it answers.
 *
 * A card and an arc are the same band at different curvature: a spine whose
 * length eases CARD_LEN → ARC_LEN along a circle of curvature `st/R`, rotated
 * and dropped on the interpolated midpoint. Drawn as a filled outline (not a
 * stroke) so the corner radius survives the morph in proportion.
 */
export function bandPath(
    st: number,
    rest: number,
    target: number,
    dx: number,
    dy: number,
    w: number,
): string {
    const len = lerp(CARD_LEN, ARC_LEN, st);
    const k = st / RING_R;
    const rot = rad(endRot(target) * st);
    const b = rad(bearing(target));
    const mx = lerp(REST_X[rest] ?? CX, CX + RING_R * Math.cos(b), st) + dx;
    const my = lerp(REST_Y[rest] ?? CY, CY + RING_R * Math.sin(b), st) + dy;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const half = w / 2;
    const rr = Math.min(CORNER * half, len / 2 - 0.1);

    /** Spine point and unit tangent at arc length `s`, in box coordinates. */
    const at = (s: number) => {
        let lx = s;
        let ly = 0;
        let a = 0;
        if (k > 1e-6) {
            const radius = 1 / k;
            a = s * k;
            lx = radius * Math.sin(a);
            ly = radius * (1 - Math.cos(a));
        }
        const tx = Math.cos(a);
        const ty = Math.sin(a);
        return {
            x: mx + lx * cos - ly * sin,
            y: my + lx * sin + ly * cos,
            tx: tx * cos - ty * sin,
            ty: tx * sin + ty * cos,
        };
    };
    /** Offset `d` along the normal (the tangent turned a quarter). */
    const off = (p: ReturnType<typeof at>, d: number) =>
        `${(p.x - p.ty * d).toFixed(2)} ${(p.y + p.tx * d).toFixed(2)}`;

    // The straight runs stop a corner radius short of each end.
    const from = -len / 2 + rr;
    const to = len / 2 - rr;
    const edge = (n: number) => at(from + ((to - from) * n) / SAMPLES);
    const head = at(len / 2);
    const tail = at(-len / 2);
    // Every corner turns the same way, so the outline closes without crossing.
    const arc = (point: string) =>
        `A${rr.toFixed(2)} ${rr.toFixed(2)} 0 0 0 ${point}`;

    let d = `M${off(edge(0), half)}`;
    for (let n = 1; n <= SAMPLES; n += 1) d += `L${off(edge(n), half)}`;
    d += arc(off(head, half - rr));
    d += `L${off(head, -(half - rr))}`;
    d += arc(off(edge(SAMPLES), -half));
    for (let n = SAMPLES - 1; n >= 0; n -= 1) d += `L${off(edge(n), -half)}`;
    d += arc(off(tail, -(half - rr)));
    d += `L${off(tail, half - rr)}`;
    d += arc(off(edge(0), half));
    return `${d}Z`;
}

/** Numeral position: beside the card at rest, outside the arc (r=93) at st=1. */
export function numeralPos(
    st: number,
    rest: number,
    target: number,
    dx: number,
    dy: number,
): {x: number; y: number} {
    const b = rad(bearing(target));
    return {
        x: lerp((REST_X[rest] ?? CX) - CARD_LEN / 2 + 12, CX + 93 * Math.cos(b), st) + dx,
        y: lerp(REST_Y[rest] ?? CY, CY + 93 * Math.sin(b), st) + dy,
    };
}

/** Arc slot geometry for the settled / static dial (st = 1, no parallax). */
export function dialArcPath(target: number, active: boolean): string {
    return bandPath(1, 0, target, 0, 0, active ? 14 : 4);
}
