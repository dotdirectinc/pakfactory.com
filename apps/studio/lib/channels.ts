/**
 * Channel registry — the single source of truth for the platform's content
 * "surfaces" (the lenses a piece of content can appear on).
 *
 * IDs are stable slugs and must not change (they're stored on documents in the
 * `channels` field, used for redirect scoping, and map to workspace names).
 * Only the `title` is a display label — e.g. the `website` channel is shown as
 * "Marketing Website".
 *
 * Shared content types (e.g. videoPost) tag themselves with one or more channel
 * ids; workspace lenses filter/preset by the channel they map to (see
 * WORKSPACE_CHANNEL). Global/Admin (channel = null) is the superset.
 */
export const CHANNELS = [
    {id: 'blog', title: 'Blog'},
    {id: 'website', title: 'Marketing Website'},
    {id: 'academy', title: 'Academy'},
] as const;

export type ChannelId = (typeof CHANNELS)[number]['id'];

/** Options list ready for a Sanity `string`/array field. */
export const CHANNEL_OPTIONS = CHANNELS.map((c) => ({
    title: c.title,
    value: c.id,
}));

/**
 * Workspace `name` → channel id it scopes to. Global/Admin maps to null
 * (superset: no filter, no create-preset). Keep keys in sync with the workspace
 * `name`s in sanity.config.ts.
 */
export const WORKSPACE_CHANNEL: Record<string, ChannelId | null> = {
    admin: null,
    blog: 'blog',
    website: 'website',
};
