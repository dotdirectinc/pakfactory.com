/**
 * Parse a YouTube watch / short / embed URL into a video id.
 * Returns null for non-YouTube or unparseable URLs (e.g. Vimeo).
 */
export function getYouTubeId(url: string): string | null {
    let parsed: URL;
    try {
        parsed = new URL(url.trim());
    } catch {
        return null;
    }

    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
        const id = parsed.pathname.split('/').filter(Boolean)[0];
        return id || null;
    }

    if (
        host === 'youtube.com' ||
        host === 'm.youtube.com' ||
        host === 'youtube-nocookie.com'
    ) {
        const fromQuery = parsed.searchParams.get('v');
        if (fromQuery) return fromQuery;

        const match = parsed.pathname.match(
            /^\/(?:embed|shorts|live)\/([^/?]+)/,
        );
        return match?.[1] ?? null;
    }

    return null;
}

/**
 * Muted, controls-free autoplay embed for hover / background playback.
 * `playlist` must equal the video id for `loop=1` to work.
 * Starts at {@link YOUTUBE_HOVER_START_SECONDS} so b-roll skips intros.
 */
export const YOUTUBE_HOVER_START_SECONDS = 15;

export function youtubeHoverEmbedSrc(videoId: string): string {
    const params = new URLSearchParams({
        autoplay: '1',
        mute: '1',
        controls: '0',
        playsinline: '1',
        loop: '1',
        playlist: videoId,
        modestbranding: '1',
        rel: '0',
        disablekb: '1',
        fs: '0',
        iv_load_policy: '3',
        cc_load_policy: '0',
        start: String(YOUTUBE_HOVER_START_SECONDS),
    });
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
