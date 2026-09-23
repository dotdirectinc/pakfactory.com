import {
    ArrowRightIcon,
    CogIcon,
    ComponentIcon,
    DocumentTextIcon,
    DocumentsIcon,
    FolderIcon,
    PackageIcon,
    TagIcon,
    UserIcon,
    WarningOutlineIcon,
    BulbOutlineIcon,
    CaseIcon,
    CheckmarkCircleIcon,
    EnvelopeIcon,
    HelpCircleIcon,
    HomeIcon,
    ImagesIcon,
    LockIcon,
    ThLargeIcon,
    AddIcon,
    PlayIcon,
} from '@sanity/icons';
import type {
    DividerBuilder,
    ListItemBuilder,
    StructureBuilder,
    StructureResolverContext,
} from 'sanity/structure';
import {MediaToolRedirect} from '../components/MediaToolRedirect';
import {
    BLOG_HOME_PAGE_IDS,
    BLOG_TOPICS_PAGE_IDS,
    BLOG_NOT_FOUND_PAGE_IDS,
    BLOG_SEARCH_PAGE_IDS,
    BLOG_CONTRIBUTE_PAGE_IDS,
} from '../lib/languages';

/** Flip true when design ships landing/static Studio lists (ADR-009 Studio UX gate). */
const BLOG_STUDIO_LANDING_PAGES = false;

function mediaLibraryItem(S: StructureBuilder): ListItemBuilder {
    return S.listItem()
        .id('mediaLibrary')
        .title('Media Library')
        .icon(ImagesIcon)
        .child(S.component(MediaToolRedirect).title('Media Library'));
}

const REDIRECT_ORDERING = [
    {field: 'isActive', direction: 'desc' as const},
    {field: '_updatedAt', direction: 'desc' as const},
];

/** Redirects filed under one group — panel 3 when a group folder is selected. */
function redirectEntriesForGroup(
    S: StructureBuilder,
    groupId: string,
    title: string,
) {
    return S.documentList()
        .title(`${title} Redirects`)
        .schemaType('redirect')
        .filter('_type == "redirect" && group._ref == $groupId')
        .params({groupId})
        .defaultOrdering(REDIRECT_ORDERING)
        .initialValueTemplates([
            S.initialValueTemplateItem('redirect-in-group', {groupId}),
        ]);
}

function ungroupedRedirectsList(S: StructureBuilder) {
    return S.documentList()
        .title('Ungrouped Redirects')
        .schemaType('redirect')
        .filter('_type == "redirect" && !defined(group)')
        .defaultOrdering(REDIRECT_ORDERING);
}

/**
 * Redirects desk item — editor-managed group folders (mirrors the Topic Groups
 * pattern in `topicsDeskItem`).
 *
 * Panel 2 = one folder per `redirectGroup` + Edit Groups + Ungrouped + All;
 * panel 3 = that group's redirects, or group CRUD.
 *
 * Grouping is organizational only. It deliberately does NOT filter by workspace:
 * the old per-channel scoping implied a redirect "belonged" to an app, which was
 * never true — a redirect's owning app is its `from` path prefix. Every workspace
 * now sees the same folders so a blog→case-studies rule is findable from either
 * lens.
 */
function redirectsDeskItem(
    S: StructureBuilder,
    context: StructureResolverContext,
): ListItemBuilder {
    return S.listItem()
        .id('redirects')
        .title('Redirects')
        .icon(ArrowRightIcon)
        .child(async () => {
            const client = context.getClient({apiVersion: '2024-01-01'});
            const groups = await client.fetch<
                {_id: string; title: string; order?: number}[]
            >(
                `*[_type == "redirectGroup"] | order(order asc, title asc){ _id, title, order }`,
            );

            // Drafts and published rows both come back; collapse to one entry per
            // published id, preferring the draft's title so a rename shows up
            // immediately in the desk (same approach as topicsDeskItem).
            const byPublishedId = new Map<
                string,
                {_id: string; title: string; order?: number}
            >();
            for (const group of groups) {
                const publishedId = group._id.replace(/^drafts\./, '');
                if (
                    !byPublishedId.has(publishedId) ||
                    group._id.startsWith('drafts.')
                ) {
                    byPublishedId.set(publishedId, {
                        _id: publishedId,
                        title: group.title,
                        order: group.order,
                    });
                }
            }

            const uniqueGroups = [...byPublishedId.values()].sort((a, b) => {
                const orderA = a.order ?? 0;
                const orderB = b.order ?? 0;
                if (orderA !== orderB) return orderA - orderB;
                return a.title.localeCompare(b.title);
            });

            const editGroupsList = S.documentTypeList('redirectGroup')
                .title('Edit Groups')
                .defaultOrdering([
                    {field: 'order', direction: 'asc'},
                    {field: 'title', direction: 'asc'},
                ]);

            return S.list()
                .title('Redirect Groups')
                .items([
                    ...uniqueGroups.map((group) =>
                        S.listItem()
                            .id(`redirect-folder-${group._id}`)
                            .title(group.title)
                            .icon(FolderIcon)
                            .child(
                                redirectEntriesForGroup(
                                    S,
                                    group._id,
                                    group.title,
                                ),
                            ),
                    ),
                    S.divider(),
                    S.listItem()
                        .id('redirects-edit-groups')
                        .title('Edit Groups')
                        .icon(CogIcon)
                        .schemaType('redirectGroup')
                        .child(editGroupsList),
                    S.listItem()
                        .id('redirects-ungrouped')
                        .title('Ungrouped')
                        .icon(ArrowRightIcon)
                        .child(ungroupedRedirectsList(S)),
                    S.divider(),
                    S.listItem()
                        .id('redirects-all')
                        .title('All Redirects')
                        .icon(ArrowRightIcon)
                        .schemaType('redirect')
                        .child(
                            S.documentTypeList('redirect')
                                .title('All Redirects')
                                .defaultOrdering(REDIRECT_ORDERING),
                        ),
                ])
                .menuItems([
                    S.menuItem()
                        .title('Create redirect group')
                        .icon(AddIcon)
                        .intent({
                            type: 'create',
                            params: {type: 'redirectGroup'},
                        }),
                ]);
        });
}

function blogNavigationItem(S: StructureBuilder): ListItemBuilder {
    // Flattened: open the single blogNavigation singleton directly (Primary &
    // Footer are field groups/tabs inside the doc) — no extra drill-down level.
    return S.listItem()
        .id('blogNavigation')
        .title('Navigation')
        .icon(ThLargeIcon)
        .child(
            S.document()
                .schemaType('blogNavigation')
                .documentId('blogNavigation')
                .title('Blog Navigation'),
        );
}

function blogHomepageItem(S: StructureBuilder): ListItemBuilder {
    // i18n dormant (English-only) — opens the single EN home directly, no per-language
    // sub-list. Restore the SUPPORTED_LANGUAGES.map() wrapper to reactivate. See lib/languages.ts.
    return S.listItem()
        .id('blogHomePage')
        .title('Homepage')
        .icon(HomeIcon)
        .child(
            S.editor()
                .id(BLOG_HOME_PAGE_IDS.en)
                .schemaType('blogPage')
                .documentId(BLOG_HOME_PAGE_IDS.en),
        );
}

function blogTopicsPageItem(S: StructureBuilder): ListItemBuilder {
    // i18n dormant (English-only) — opens the single EN topic page directly.
    // Restore the SUPPORTED_LANGUAGES.map() wrapper to reactivate. See lib/languages.ts.
    return S.listItem()
        .id('blogTopicsPage')
        .title('Topic Landing Page')
        .icon(TagIcon)
        .child(
            S.editor()
                .id(BLOG_TOPICS_PAGE_IDS.en)
                .schemaType('blogPage')
                .documentId(BLOG_TOPICS_PAGE_IDS.en),
        );
}

function blogNotFoundPageItem(S: StructureBuilder): ListItemBuilder {
    // i18n dormant (English-only) — opens the single EN 404 singleton directly.
    // The 404 is not routable: it is a content source for the Next `not-found` page.
    return S.listItem()
        .id('blogNotFoundPage')
        .title('404 Landing Page')
        .icon(WarningOutlineIcon)
        .child(
            S.editor()
                .id(BLOG_NOT_FOUND_PAGE_IDS.en)
                .schemaType('blogPage')
                .documentId(BLOG_NOT_FOUND_PAGE_IDS.en),
        );
}

function blogSearchPageItem(S: StructureBuilder): ListItemBuilder {
    // Content source for the reserved `/search` code route (not a landing slug).
    return S.listItem()
        .id('blogSearchPage')
        .title('Search page')
        .icon(BulbOutlineIcon)
        .child(
            S.editor()
                .id(BLOG_SEARCH_PAGE_IDS.en)
                .schemaType('blogPage')
                .documentId(BLOG_SEARCH_PAGE_IDS.en),
        );
}

function blogContributePageItem(S: StructureBuilder): ListItemBuilder {
    // Content source for the reserved `/contribute` code route (form stays in app).
    return S.listItem()
        .id('blogContributePage')
        .title('Contribute page')
        .icon(EnvelopeIcon)
        .child(
            S.editor()
                .id(BLOG_CONTRIBUTE_PAGE_IDS.en)
                .schemaType('blogPage')
                .documentId(BLOG_CONTRIBUTE_PAGE_IDS.en),
        );
}

function blogPagesFolder(S: StructureBuilder): ListItemBuilder {
    const pageItems: ListItemBuilder[] = [
        blogHomepageItem(S),
        blogTopicsPageItem(S),
        blogNotFoundPageItem(S),
        blogSearchPageItem(S),
        blogContributePageItem(S),
    ];

    if (BLOG_STUDIO_LANDING_PAGES) {
        pageItems.push(
            S.listItem()
                .title('Landing Page')
                .icon(DocumentsIcon)
                .schemaType('blogPage')
                .child(
                    S.documentTypeList('blogPage')
                        .title('Landing Page')
                        .filter('_type == "blogPage" && pageRole == "landing"')
                        .defaultOrdering([{field: 'title', direction: 'asc'}]),
                ),
            S.listItem()
                .title('Static Page')
                .icon(DocumentTextIcon)
                .schemaType('blogPage')
                .child(
                    S.documentTypeList('blogPage')
                        .title('Static Page')
                        .filter('_type == "blogPage" && pageRole == "static"')
                        .defaultOrdering([{field: 'title', direction: 'asc'}]),
                ),
        );
    }

    return S.listItem()
        .title('Page')
        .icon(DocumentsIcon)
        .child(
            S.list()
                .title('Page')
                .items([
                    ...pageItems,
                    S.divider(),
                    typeSettingsItem(S, 'pageSettings'),
                ]),
        );
}

/** Topics in a CMS group — panel 3 when a group row is selected. */
function topicEntriesForGroup(
    S: StructureBuilder,
    groupId: string,
    title: string,
) {
    return S.documentList()
        .title(`${title} Topic`)
        .schemaType('blogTag')
        .filter('_type == "blogTag" && topicGroup._ref == $groupId')
        .params({groupId})
        .defaultOrdering([{field: 'title', direction: 'asc'}])
        .initialValueTemplates([
            S.initialValueTemplateItem('blogTag-in-group', {groupId}),
        ]);
}

function ungroupedTopicsList(S: StructureBuilder) {
    return S.documentList()
        .title('Ungrouped')
        .schemaType('blogTag')
        .filter('_type == "blogTag" && !defined(topicGroup)')
        .defaultOrdering([{field: 'title', direction: 'asc'}]);
}

/** Panel 2 = group folders + Edit groups + Ungrouped; panel 3 = topics or group CRUD. */
function topicsDeskItem(
    S: StructureBuilder,
    context: StructureResolverContext,
): ListItemBuilder {
    return S.listItem()
        .title('Topic')
        .icon(TagIcon)
        .child(async () => {
            const client = context.getClient({apiVersion: '2024-01-01'});
            const groups = await client.fetch<
                {_id: string; title: string; order?: number}[]
            >(
                `*[_type == "blogTopicGroup"] | order(order asc, title asc){ _id, title, order }`,
            );

            const byPublishedId = new Map<
                string,
                {_id: string; title: string; order?: number}
            >();
            for (const group of groups) {
                const publishedId = group._id.replace(/^drafts\./, '');
                if (
                    !byPublishedId.has(publishedId) ||
                    group._id.startsWith('drafts.')
                ) {
                    byPublishedId.set(publishedId, {
                        _id: publishedId,
                        title: group.title,
                        order: group.order,
                    });
                }
            }

            const uniqueGroups = [...byPublishedId.values()].sort((a, b) => {
                const orderA = a.order ?? 0;
                const orderB = b.order ?? 0;
                if (orderA !== orderB) return orderA - orderB;
                return a.title.localeCompare(b.title);
            });

            const editGroupsList = S.documentTypeList('blogTopicGroup')
                .title('Edit Groups')
                .defaultOrdering([
                    {field: 'order', direction: 'asc'},
                    {field: 'title', direction: 'asc'},
                ]);

            return S.list()
                .title('Topic Groups')
                .items([
                    ...uniqueGroups.map((group) =>
                        S.listItem()
                            .id(`topic-folder-${group._id}`)
                            .title(group.title)
                            .icon(FolderIcon)
                            .child(
                                topicEntriesForGroup(S, group._id, group.title),
                            ),
                    ),
                    S.divider(),
                    S.listItem()
                        .id('blog-topics-edit-groups')
                        .title('Edit Groups')
                        .icon(CogIcon)
                        .schemaType('blogTopicGroup')
                        .child(editGroupsList),
                    S.listItem()
                        .id('blog-topics-ungrouped')
                        .title('Ungrouped')
                        .icon(TagIcon)
                        .child(ungroupedTopicsList(S)),
                    S.divider(),
                    typeSettingsItem(S, 'topicSettings'),
                ])
                .menuItems([
                    S.menuItem()
                        .title('Create topic group')
                        .icon(AddIcon)
                        .intent({
                            type: 'create',
                            params: {type: 'blogTopicGroup'},
                        }),
                ]);
        });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED BUILDING BLOCKS
// Each function returns an array of list items / dividers so they can be
// composed freely into any workspace structure.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A "Settings" child pinned to a per-type settings singleton (PROD-2116),
 * co-located next to its list — mirroring the Case Studies "Page Settings" item.
 */
function typeSettingsItem(
    S: StructureBuilder,
    singletonId: string,
): ListItemBuilder {
    return S.listItem()
        .id(singletonId)
        .title('Settings')
        .icon(CogIcon)
        .child(
            S.editor()
                .id(singletonId)
                .schemaType(singletonId)
                .documentId(singletonId),
        );
}

export function blogItems(
    S: StructureBuilder,
    context: StructureResolverContext,
): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.listItem()
            .title('Post')
            .icon(DocumentTextIcon)
            .child(
                S.list()
                    .title('Post')
                    .items([
                        S.listItem()
                            .title('Posts')
                            .icon(DocumentTextIcon)
                            .schemaType('post')
                            .child(
                                S.documentTypeList('post')
                                    .title('Posts')
                                    .defaultOrdering([
                                        {field: 'publishedAt', direction: 'desc'},
                                    ]),
                            ),
                        typeSettingsItem(S, 'postSettings'),
                    ]),
            ),

        S.listItem()
            .title('Category')
            .icon(FolderIcon)
            .child(
                S.list()
                    .title('Category')
                    .items([
                        S.listItem()
                            .title('Categories')
                            .icon(FolderIcon)
                            .schemaType('blogCategory')
                            .child(
                                S.documentTypeList('blogCategory')
                                    .title('Categories')
                                    .defaultOrdering([
                                        {field: 'title', direction: 'asc'},
                                    ]),
                            ),
                        typeSettingsItem(S, 'categorySettings'),
                    ]),
            ),

        topicsDeskItem(S, context),

        S.listItem()
            .title('Author')
            .icon(UserIcon)
            .child(
                S.list()
                    .title('Author')
                    .items([
                        S.listItem()
                            .title('Authors')
                            .icon(UserIcon)
                            .schemaType('author')
                            .child(
                                S.documentTypeList('author').title('Authors'),
                            ),
                        typeSettingsItem(S, 'authorSettings'),
                    ]),
            ),

        S.listItem()
            .title('Video')
            .icon(PlayIcon)
            .schemaType('videoPost')
            .child(
                S.documentTypeList('videoPost')
                    .title('Video Post')
                    .defaultOrdering([
                        {field: 'publishedAt', direction: 'desc'},
                    ]),
            ),

        S.listItem()
            .title('Widget')
            .icon(ComponentIcon)
            .child(
                S.list()
                    .title('Widget')
                    .items([
                        S.listItem()
                            .title('Block')
                            .schemaType('contentWidget')
                            .child(
                                S.documentTypeList('contentWidget')
                                    .title('Block')
                                    .filter('widgetType == "cta"')
                                    .defaultOrdering([
                                        {
                                            field: 'internalTitle',
                                            direction: 'asc',
                                        },
                                    ]),
                            ),

                        S.listItem()
                            .title('Product Card')
                            .schemaType('contentWidget')
                            .child(
                                S.documentTypeList('contentWidget')
                                    .title('Product Card')
                                    .filter('widgetType == "product-card"')
                                    .defaultOrdering([
                                        {
                                            field: 'internalTitle',
                                            direction: 'asc',
                                        },
                                    ]),
                            ),

                        S.divider(),

                        S.listItem()
                            .title('All')
                            .schemaType('contentWidget')
                            .child(
                                S.documentTypeList('contentWidget')
                                    .title('All')
                                    .defaultOrdering([
                                        {field: 'widgetType', direction: 'asc'},
                                        {
                                            field: 'internalTitle',
                                            direction: 'asc',
                                        },
                                    ]),
                            ),
                    ]),
            ),

        blogPagesFolder(S),

        blogNavigationItem(S),
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED BUILDING BLOCKS
// Composed into the workspace roots below.
// ─────────────────────────────────────────────────────────────────────────────

interface SettingsOptions {
    blog?: boolean;
    solutions?: boolean;
    /** Show the Media Library inside the Settings section (under the divider). */
    media?: boolean;
}

/**
 * Ops › Migration Ledger — read-only view of `migrationRun`.
 *
 * The ledger answers "what has run against THIS dataset", which is otherwise only
 * reachable from a terminal with a token. Pinned to the Admin workspace on purpose:
 * it is operational provenance, not content, so it does not belong in the Blog or
 * Website desks. Newest first, because the question is almost always about the last
 * deploy. Documents are read-only at the schema level (see `schemas/migrationRun.ts`) —
 * this pane shows the record, it does not offer to edit it.
 */
export function migrationLedgerItem(S: StructureBuilder): ListItemBuilder {
    return S.listItem()
        .title('Migration Ledger')
        .icon(CheckmarkCircleIcon)
        .schemaType('migrationRun')
        .child(
            S.documentTypeList('migrationRun')
                .title('Migration Ledger')
                .defaultOrdering([{field: 'ranAt', direction: 'desc'}]),
        );
}

export function settingsItems(
    S: StructureBuilder,
    context: StructureResolverContext,
    options: SettingsOptions = {},
): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.divider().title('Settings'),

        ...(options.media ? [mediaLibraryItem(S)] : []),

        redirectsDeskItem(S, context),

        S.listItem()
            .title('Global Settings')
            .icon(CogIcon)
            .child(
                S.editor()
                    .id('settings')
                    .schemaType('settings')
                    .documentId('settings'),
            ),
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKSPACE STRUCTURES
// Compose the building blocks per workspace.
// ─────────────────────────────────────────────────────────────────────────────

/** Blog — editorial team */
export const blogStructure = (
    S: StructureBuilder,
    context: StructureResolverContext,
) =>
    S.list()
        .title('Blog')
        .items([
            ...blogItems(S, context),
            ...settingsItems(S, context, {blog: true}),
        ]);

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS & CUSTOMIZATION workspaces (PROD-2309 / D39)
// Documents-only folders for now — the §3.1 per-type listing-page and Settings
// children are deferred until those singleton types exist (none do today).
// Bundle has no schema yet (no Track A ticket), so it has no folder.
// Property + Property Value are homed in Global but listed in both sidebars (D39).
// ─────────────────────────────────────────────────────────────────────────────

function propertyGlobalItems(S: StructureBuilder): ListItemBuilder[] {
    return [
        S.listItem()
            .title('Properties')
            .schemaType('property')
            .child(S.documentTypeList('property').title('Properties')),
        S.listItem()
            .title('Property Values')
            .schemaType('propertyValue')
            .child(S.documentTypeList('propertyValue').title('Property Values')),
    ];
}

export function productsItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.listItem()
            .title('Product Lines')
            .schemaType('productLine')
            .child(S.documentTypeList('productLine').title('Product Lines')),
        S.listItem()
            .title('Product Styles')
            .schemaType('productStyle')
            // Title, not Last Edited (PROD-2546) — same reasoning as the Customization
            // lists. Grouping by Line is the sort editors want, but a reference path
            // cannot be a list default; it ships as a menu entry on `productStyle.ts`.
            .child(
                S.documentTypeList('productStyle')
                    .title('Product Styles')
                    .defaultOrdering([{field: 'title', direction: 'asc'}]),
            ),
        S.listItem()
            .title('Standard Products')
            .schemaType('product')
            // Split by `kind` (PROD-2547). Inspiration presets live in the Solutions
            // workspace, because Solutions is the surface they hang off; this list is
            // the fully-configurable line/style products only.
            //
            // ⚠ `.filter()` REPLACES the `_type == $type` that `documentTypeList`
            // sets for itself — it does not append — so the type clause is restated
            // here. Drop it and the list queries every document type in the dataset
            // and merely happens to look right.
            .child(
                S.documentTypeList('product')
                    .title('Standard Products')
                    .filter('_type == $type && kind == $kind')
                    .params({type: 'product', kind: 'standard'}),
            ),
        S.listItem()
            .title('Bundles')
            .schemaType('bundle')
            .child(S.documentTypeList('bundle').title('Bundles')),
        S.divider().title('Global'),
        ...propertyGlobalItems(S),
    ];
}

export function customizationItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.listItem()
            .title('Categories')
            .schemaType('customizationCategory')
            .child(S.documentTypeList('customizationCategory').title('Customization Categories')),
        S.listItem()
            .title('Types')
            .schemaType('customizationType')
            // Title, not Last Edited (PROD-2545) — same reasoning as Options below.
            // Grouping by Category is the sort editors want, but a reference path cannot
            // be a list default; it ships as a menu entry on `customizationType.ts`.
            .child(
                S.documentTypeList('customizationType')
                    .title('Customization Types')
                    .defaultOrdering([{field: 'title', direction: 'asc'}]),
            ),
        S.listItem()
            .title('Options')
            .schemaType('customizationOption')
            // Title, not Last Edited (PROD-2544). Last Edited is the Studio's own default
            // and it reshuffles underfoot: editing any option throws it to the top while
            // an editor is working a Type at a time. Alphabetical holds still.
            //
            // Grouping by Type is what editors actually want, and it is NOT settable here.
            // `defaultOrdering` takes a bare `SortOrderingItem[]`, and `PaneContainer`
            // builds the default as `{by: defaultOrdering}` — no slot for the extended
            // projection that makes a reference path like `type.title` resolve. Setting it
            // here does not error; it silently sorts by the next key, which is why this
            // reads `title` and not `type.title`. The Type grouping ships as a sort-MENU
            // entry instead (`orderings` in `customizationOption.ts`, which explains the
            // mechanism); an editor picks it once and it persists per user.
            .child(
                S.documentTypeList('customizationOption')
                    .title('Customization Options')
                    .defaultOrdering([{field: 'title', direction: 'asc'}]),
            ),
        S.divider().title('Global'),
        ...propertyGlobalItems(S),
    ];
}

/** Products — Product Line · Product Style · Product (+ Global Property picks) */
/**
 * Editors have no Presentation tab in these workspaces while the surface is
 * unreleased (PROD-2494), so the structure says where previewing does happen.
 *
 * Gated on the SAME switch as the tool itself — `SANITY_STUDIO_PREVIEW_URL_SITE`
 * — so the note cannot outlive the condition it describes: wire the production
 * preview target and the tab appears while this label disappears, from one
 * value in scripts/sanity/studio-targets.mjs.
 */
const sitePreviewHint = (S: StructureBuilder) =>
    process.env.SANITY_STUDIO_PREVIEW_URL_SITE
        ? []
        : [S.divider().title('Preview from the staging Studio until release')];

export const productsStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Products')
        .items([...sitePreviewHint(S), ...productsItems(S)]);

/** Customization — Category · Type · Option · Option Group (+ Global Property picks) */
export const customizationStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Customization')
        .items([...sitePreviewHint(S), ...customizationItems(S)]);

// ─────────────────────────────────────────────────────────────────────────────
// D1 workspaces (PROD-2329 / D39) — Case Studies · Global (+ Solutions ·
// Expertise · Resources · Main Website in D2). Blog / Products / Customization
// have their own structures above. Every workspace registers the full schema;
// they differ only in structure (§3.1). No "All Content" catch-all — D39 (4).
// ─────────────────────────────────────────────────────────────────────────────

/** Case Studies — Case Study · Client · its listing page (§3.1). */
export function caseStudiesItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.listItem()
            .title('Case Studies')
            .icon(CaseIcon)
            .schemaType('caseStudy')
            .child(
                S.documentTypeList('caseStudy')
                    .title('Case Studies')
                    .defaultOrdering([{field: 'publishedAt', direction: 'desc'}]),
            ),
        S.listItem()
            .title('Clients')
            .icon(UserIcon)
            .schemaType('client')
            .child(
                S.documentTypeList('client')
                    .title('Clients')
                    .defaultOrdering([{field: 'name', direction: 'asc'}]),
            ),
        S.listItem()
            .title('Case Studies Page')
            .icon(CogIcon)
            .child(
                S.editor().id('caseStudiesPage').schemaType('listingPage').documentId('caseStudiesPage'),
            ),
    ];
}

/** Global — what applies everywhere: taxonomy + technical SEO (§3.1). Property
 *  and Property Value are homed here and also listed in Products/Customization. */
export function globalItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
    return [
        ...propertyGlobalItems(S),
        S.divider().title('Technical SEO'),
        S.listItem()
            .title('Redirects')
            .schemaType('redirect')
            .child(S.documentTypeList('redirect').title('Redirects')),
        S.listItem()
            .title('Redirect Groups')
            .schemaType('redirectGroup')
            .child(S.documentTypeList('redirectGroup').title('Redirect Groups')),
        S.listItem()
            .title('Global Settings')
            .icon(CogIcon)
            .child(S.editor().id('settings').schemaType('settings').documentId('settings')),
    ];
}

/** Case Studies workspace. */
export const caseStudiesStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Case Studies')
        .items([...caseStudiesItems(S)]);

/** Global workspace. */
export const globalStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Global')
.items([...sitePreviewHint(S), ...globalItems(S), migrationLedgerItem(S)]);

/** Solutions workspace (PROD-2330 / D2) — the `solution` type has 30 docs, so it
 *  earns a home. Its settings singleton lives with it (§3.1). Expertise,
 *  Resources and Main Website stay unbuilt (unbuilt types / Questions for Dev #1). */
export const solutionsWorkspaceStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Solutions')
        .items([
            ...sitePreviewHint(S),
            S.listItem()
                .title('Solutions')
                .icon(BulbOutlineIcon)
                .schemaType('solution')
                .child(
                    S.documentTypeList('solution')
                        .title('Solutions')
                        .defaultOrdering([{field: 'title', direction: 'asc'}]),
                ),
            // Second level. Flat rather than nested under each solution: a
            // collection is edited far more often than the solution above it,
            // and one list is fewer clicks than 36 folders.
            S.listItem()
                .title('Solution Styles')
                .icon(ThLargeIcon)
                .schemaType('solutionStyle')
                .child(
                    S.documentTypeList('solutionStyle')
                        .title('Solution Styles')
                        .defaultOrdering([{field: 'title', direction: 'asc'}]),
                ),
            // Inspiration presets are `product` documents, but their breadcrumb runs
            // through Solutions, so this is where they are edited (PROD-2547). The
            // Products workspace holds the standard products; neither list shows the
            // other's rows.
            //
            // The template is load-bearing, not decoration: `kind` has
            // `initialValue: 'standard'`, so a plain `+` here would create a document
            // that immediately vanishes from the list it was created in.
            //
            // No `.icon()`: `product.ts` already declares `icon: PackageIcon` and
            // `.schemaType()` picks it up. Setting it again costs a type error against
            // the 227 baseline for an icon that already renders.
            S.listItem()
                .title('Inspiration Products')
                .schemaType('product')
                .child(
                    S.documentTypeList('product')
                        .title('Inspiration Products')
                        .filter('_type == $type && kind == $kind')
                        .params({type: 'product', kind: 'inspiration'})
                        .initialValueTemplates([
                            S.initialValueTemplateItem('product-inspiration'),
                        ]),
                ),
        ]);

/** Expertise workspace (PROD-2330 / D2) — listing singleton + stages + services. */
export const expertiseStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Expertise')
        .items([
            ...sitePreviewHint(S),
            S.listItem()
                .title('Expertise Page')
                .icon(CogIcon)
                .child(
                    S.editor()
                        .id('expertisePage')
                        .schemaType('listingPage')
                        .documentId('expertisePage'),
                ),
            S.listItem()
                .title('Expertise Stages')
                .schemaType('expertiseStage')
                .child(S.documentTypeList('expertiseStage').title('Expertise Stages')),
            S.listItem()
                .title('Expertise Services')
                .schemaType('expertiseService')
                .child(S.documentTypeList('expertiseService').title('Expertise Services')),
        ]);

/** Resources workspace (PROD-2330 / D2) — the built types today (Glossary Term ·
 *  Guide · Help Article). FAQ · Help Category · Dieline join when they exist. */
export const resourcesWorkspaceStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Resources')
        .items([
            ...sitePreviewHint(S),
            S.listItem()
                .title('FAQs')
                .icon(HelpCircleIcon)
                .schemaType('faq')
                .child(S.documentTypeList('faq').title('FAQs')),
            S.listItem()
                .title('Help Categories')
                .icon(FolderIcon)
                .schemaType('helpCategory')
                .child(S.documentTypeList('helpCategory').title('Help Categories')),
            S.listItem()
                .title('Glossary Terms')
                .schemaType('glossaryTerm')
                .child(S.documentTypeList('glossaryTerm').title('Glossary Terms')),
            S.listItem()
                .title('Guides')
                .schemaType('guide')
                .child(S.documentTypeList('guide').title('Guides')),
            S.listItem()
                .title('Dielines')
                .icon(DocumentsIcon)
                .schemaType('dieline')
                .child(S.documentTypeList('dieline').title('Dielines')),
        ]);

/** Main Website workspace (PROD-2330 / D2 · PROD-2589) — pages no content area
 *  owns, plus domain folders for listing/template singletons. Expertise folder
 *  is an empty placeholder until its singleton lands. */
export const mainWebsiteStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Main Website')
        .items([
            ...sitePreviewHint(S),
            // Platform pages (PROD-2292) — shared types. Old static singletons
            // (aboutPage/contactPage/privacyPolicy/termsOfService) folded into
            // Content Page / Legal Page and were removed in pt 3.
            S.listItem()
                .title('Home Page')
                .icon(HomeIcon)
                .child(S.editor().id('homePage').schemaType('homePage').documentId('homePage')),
            // Domain page folders (PROD-2589). Empty Expertise folder reserves
            // IA for a future singleton; Product / Customization / Solution /
            // Case Study pins are live.
            S.listItem()
                .title('Product Pages')
                .icon(PackageIcon)
                .child(
                    S.list()
                        .title('Product Pages')
                        .items([
                            S.listItem()
                                .title('Product Catalog Page')
                                .icon(PackageIcon)
                                .child(
                                    S.editor()
                                        .id('productCatalogPage')
                                        .schemaType('productCatalogPage')
                                        .documentId('productCatalogPage'),
                                ),
                        ]),
                ),
            S.listItem()
                .title('Solution Pages')
                .icon(BulbOutlineIcon)
                .child(
                    S.list()
                        .title('Solution Pages')
                        .items([
                            S.listItem()
                                .title('Solution Industry Page')
                                .icon(BulbOutlineIcon)
                                .child(
                                    S.editor()
                                        .id('solutionIndustryPage')
                                        .schemaType('solutionIndustryPage')
                                        .documentId('solutionIndustryPage'),
                                ),
                        ]),
                ),
            S.listItem()
                .title('Expertise Pages')
                .icon(CheckmarkCircleIcon)
                .child(S.list().title('Expertise Pages').items([])),
            S.listItem()
                .title('Case Study Pages')
                .icon(CaseIcon)
                .child(
                    S.list()
                        .title('Case Study Pages')
                        .items([
                            S.listItem()
                                .title('Case Studies Page')
                                .icon(ThLargeIcon)
                                .child(
                                    S.editor()
                                        .id('caseStudiesPage')
                                        .schemaType('listingPage')
                                        .documentId('caseStudiesPage'),
                                ),
                        ]),
                ),
            S.listItem()
                .title('Customization Pages')
                .icon(ComponentIcon)
                .child(
                    S.list()
                        .title('Customization Pages')
                        .items([
                            S.listItem()
                                .title('Customization Catalog Page')
                                .icon(ComponentIcon)
                                .child(
                                    S.editor()
                                        .id('customizationCatalogPage')
                                        .schemaType('customizationCatalogPage')
                                        .documentId('customizationCatalogPage'),
                                ),
                        ]),
                ),
            S.listItem()
                .title('Content Pages')
                .icon(DocumentTextIcon)
                .schemaType('contentPage')
                .child(S.documentTypeList('contentPage').title('Content Pages')),
            S.listItem()
                .title('Legal Pages')
                .icon(LockIcon)
                .schemaType('legalPage')
                .child(S.documentTypeList('legalPage').title('Legal Pages')),
            S.listItem()
                .title('Navigation')
                .icon(ThLargeIcon)
                .child(S.editor().id('websiteNavigation').schemaType('websiteNavigation').documentId('websiteNavigation')),
        ]);

// The "All Content" catch-all structure was removed with its workspace (D39
// change (4), PROD-2334): the nine workspaces cover every filed type, and an
// unfiled type is still reachable by search / reference pickers and audited via
// Vision (array::unique(*[]._type)). See sanity.config.ts.

