import {
    ArrowRightIcon,
    CogIcon,
    ComponentIcon,
    DocumentTextIcon,
    DocumentsIcon,
    FolderIcon,
    PackageIcon,
    ColorWheelIcon,
    TagIcon,
    UserIcon,
    WarningOutlineIcon,
    BookIcon,
    BulbOutlineIcon,
    CaseIcon,
    EnvelopeIcon,
    HelpCircleIcon,
    HomeIcon,
    ImagesIcon,
    LockIcon,
    StarIcon,
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

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAG
// Set to false to revert all workspaces to Global Settings only.
// ─────────────────────────────────────────────────────────────────────────────
const WORKSPACE_SETTINGS = true;

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

/**
 * Global (Admin) navigation grouping — lists every channel's navigation
 * singleton by the "<Channel> Navigation" convention. Only Blog Navigation
 * exists today; when the Marketing Website / Academy nav singletons are built,
 * add them here (and expose each directly in its own lens like blogNavigationItem).
 */
function globalNavigationItem(S: StructureBuilder): ListItemBuilder {
    return S.listItem()
        .id('navigation')
        .title('Navigation')
        .icon(ThLargeIcon)
        .child(
            S.list()
                .title('Navigation')
                .items([
                    S.listItem()
                        .id('blogNavigation')
                        .title('Blog Navigation')
                        .child(
                            S.document()
                                .schemaType('blogNavigation')
                                .documentId('blogNavigation')
                                .title('Blog Navigation'),
                        ),
                    // Marketing Website Navigation → add when websiteNavigation exists
                    // Academy Navigation → add when academyNavigation exists
                ]),
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

export function websiteItems(
    S: StructureBuilder,
): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.divider().title('Website'),

        S.listItem()
            .title('Pages')
            .child(
                S.list()
                    .title('Pages')
                    .items([
                        S.listItem()
                            .title('Home')
                            .child(
                                S.documentTypeList('page')
                                    .title('Home')
                                    .filter('pageType == "home"'),
                            ),
                        S.listItem()
                            .title('Category Landing Pages')
                            .child(
                                S.documentTypeList('page')
                                    .title('Category Landing Pages')
                                    .filter('pageType == "landing-category"'),
                            ),
                        S.listItem()
                            .title('Type Landing Pages')
                            .child(
                                S.documentTypeList('page')
                                    .title('Type Landing Pages')
                                    .filter('pageType == "landing-type"'),
                            ),
                        S.listItem()
                            .title('Industry Pages')
                            .child(
                                S.documentTypeList('page')
                                    .title('Industry Pages')
                                    .filter('pageType == "landing-industry"'),
                            ),
                        S.listItem()
                            .title('Service Pages')
                            .child(
                                S.documentTypeList('page')
                                    .title('Service Pages')
                                    .filter('pageType == "landing-service"'),
                            ),
                        S.listItem()
                            .title('Static Pages')
                            .child(
                                S.documentTypeList('page')
                                    .title('Static Pages')
                                    .filter('pageType == "static"'),
                            ),
                    ]),
            ),
    ];
}

export function knowledgeLibraryItems(
    S: StructureBuilder,
): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.divider().title('Knowledge Library'),

        // ── Customization ─────────────────────────────────────────────────────────
        S.listItem()
            .title('Customization')
            .icon(ColorWheelIcon)
            .child(
                S.list()
                    .title('Customization')
                    .items([
                        S.listItem()
                            .title('Browse by Category')
                            .child(
                                S.documentTypeList('customizationCategory')
                                    .title('Categories')
                                    .child((categoryId) =>
                                        S.documentTypeList('customizationType')
                                            .title('Types')
                                            .filter(
                                                'category._ref == $categoryId',
                                            )
                                            .params({categoryId})
                                            .child((typeId) =>
                                                S.documentTypeList('customizationOption')
                                                    .title('Customizations')
                                                    .filter(
                                                        'type._ref == $typeId',
                                                    )
                                                    .params({typeId}),
                                            ),
                                    ),
                            ),

                        S.listItem()
                            .title('All Customizations')
                            .schemaType('customizationOption')
                            .child(
                                S.documentTypeList('customizationOption').title(
                                    'All Customizations',
                                ),
                            ),

                        S.divider(),

                        S.listItem()
                            .title('Taxonomy')
                            .child(
                                S.list()
                                    .title('Customization Taxonomy')
                                    .items([
                                        S.listItem()
                                            .title('Customization Categories')
                                            .schemaType('customizationCategory')
                                            .child(
                                                S.documentTypeList(
                                                    'customizationCategory',
                                                ).title(
                                                    'Customization Categories',
                                                ),
                                            ),
                                        S.listItem()
                                            .title('Customization Types')
                                            .schemaType('customizationType')
                                            .child(
                                                S.documentTypeList(
                                                    'customizationType',
                                                ).title('Customization Types'),
                                            ),
                                        S.listItem()
                                            .title('Option Groups')
                                            .schemaType('optionGroup')
                                            .child(
                                                S.documentTypeList('optionGroup')
                                                    .title('Option Groups')
                                                    .defaultOrdering([
                                                        {
                                                            field: 'title',
                                                            direction: 'asc',
                                                        },
                                                    ]),
                                            ),
                                        S.listItem()
                                            .title('Attribute Groups')
                                            .schemaType('property')
                                            .child(
                                                S.documentTypeList(
                                                    'property',
                                                ).title('Attribute Groups'),
                                            ),
                                        S.listItem()
                                            .title('Attributes')
                                            .schemaType('propertyValue')
                                            .child(
                                                S.documentTypeList('propertyValue')
                                                    .title('Attributes')
                                                    .defaultOrdering([
                                                        {
                                                            field: 'property.title',
                                                            direction: 'asc',
                                                        },
                                                        {
                                                            field: 'order',
                                                            direction: 'asc',
                                                        },
                                                    ]),
                                            ),
                                    ]),
                            ),
                    ]),
            ),

        // ── Products ──────────────────────────────────────────────────────────────
        S.listItem()
            .title('Products')
            .icon(PackageIcon)
            .child(
                S.list()
                    .title('Products')
                    .items([
                        S.listItem()
                            .title('All')
                            .schemaType('product')
                            .child(
                                S.documentTypeList('product').title(
                                    'All Products',
                                ),
                            ),

                        S.listItem()
                            .title('Standard')
                            .child(
                                S.documentTypeList('productLine')
                                    .title('Product Lines')
                                    .child((categoryId) =>
                                        S.documentTypeList(
                                            'productStyle',
                                        )
                                            .title('Product Styles')
                                            .filter(
                                                'productLine._ref == $categoryId',
                                            )
                                            .params({categoryId})
                                            .child((styleId) =>
                                                S.documentTypeList('product')
                                                    .title('Products')
                                                    .filter(
                                                        '$styleId in productStyleCategories[]._ref && (kind == "standard" || kind == "both")',
                                                    )
                                                    .params({styleId}),
                                            ),
                                    ),
                            ),


                        S.divider(),

                        S.listItem()
                            .title('Taxonomy')
                            .child(
                                S.list()
                                    .title('Taxonomy')
                                    .items([
                                        S.listItem()
                                            .title('Categories')
                                            .child(
                                                S.list()
                                                    .title('Categories')
                                                    .items([
                                                        S.listItem()
                                                            .title(
                                                                'Product Lines',
                                                            )
                                                            .schemaType(
                                                                'productLine',
                                                            )
                                                            .child(
                                                                S.documentTypeList(
                                                                    'productLine',
                                                                ).title(
                                                                    'Product Lines',
                                                                ),
                                                            ),
                                                        S.listItem()
                                                            .title(
                                                                'Product Styles',
                                                            )
                                                            .schemaType(
                                                                'productStyle',
                                                            )
                                                            .child(
                                                                S.documentTypeList(
                                                                    'productStyle',
                                                                ).title(
                                                                    'Product Styles',
                                                                ),
                                                            ),
                                                    ]),
                                            ),

                                    ]),
                            ),
                    ]),
            ),
    ];
}

export function solutionItems(
    S: StructureBuilder,
): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.divider().title('Solutions'),

        S.listItem()
            .title('Solutions')
            .icon(BulbOutlineIcon)
            .schemaType('solution')
            .child(
                S.documentTypeList('solution')
                    .title('Solutions')
                    .defaultOrdering([
                        {field: 'internalTitle', direction: 'asc'},
                    ]),
            ),
    ];
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN-SPECIFIC BUILDING BLOCKS
// Used only in adminStructure. Individual workspaces use their own flat items.
// ─────────────────────────────────────────────────────────────────────────────

interface CoreEntitiesOptions {
    hideCaseStudies?: boolean;
    label?: string;
}

export function coreEntitiesItems(
    S: StructureBuilder,
    options: CoreEntitiesOptions = {},
): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.divider().title(options.label ?? 'Core Entities'),

        // ── Products ──────────────────────────────────────────────────────────────
        S.listItem()
            .title('Products')
            .icon(PackageIcon)
            .child(
                S.list()
                    .title('Products')
                    .items([
                        S.listItem()
                            .title('All')
                            .schemaType('product')
                            .child(
                                S.documentTypeList('product').title(
                                    'All Products',
                                ),
                            ),
                        S.listItem()
                            .title('Standard')
                            .child(
                                S.documentTypeList('productLine')
                                    .title('Product Lines')
                                    .child((categoryId) =>
                                        S.documentTypeList(
                                            'productStyle',
                                        )
                                            .title('Product Styles')
                                            .filter(
                                                'productLine._ref == $categoryId',
                                            )
                                            .params({categoryId})
                                            .child((styleId) =>
                                                S.documentTypeList('product')
                                                    .title('Products')
                                                    .filter(
                                                        '$styleId in productStyleCategories[]._ref && (kind == "standard" || kind == "both")',
                                                    )
                                                    .params({styleId}),
                                            ),
                                    ),
                            ),
                        S.divider(),
                        S.listItem()
                            .title('Taxonomy')
                            .child(
                                S.list()
                                    .title('Taxonomy')
                                    .items([
                                        S.listItem()
                                            .title('Product Lines')
                                            .schemaType('productLine')
                                            .child(
                                                S.documentTypeList(
                                                    'productLine',
                                                ).title('Product Lines'),
                                            ),
                                        S.listItem()
                                            .title('Product Styles')
                                            .schemaType('productStyle')
                                            .child(
                                                S.documentTypeList(
                                                    'productStyle',
                                                ).title('Product Styles'),
                                            ),
                                    ]),
                            ),
                    ]),
            ),

        // ── Solutions ─────────────────────────────────────────────────────────────
        // Flat model: one `solution` document type, pre-organized by `solutionType`.
        // Each folder is the same document set filtered by type — mirrors Products.
        S.listItem()
            .title('Solutions')
            .icon(BulbOutlineIcon)
            .child(
                S.list()
                    .title('Solutions')
                    .items([
                        S.listItem()
                            .title('All')
                            .schemaType('solution')
                            .child(
                                S.documentTypeList('solution')
                                    .title('All Solutions')
                                    .defaultOrdering([
                                        {
                                            field: 'internalTitle',
                                            direction: 'asc',
                                        },
                                    ]),
                            ),
                        S.listItem()
                            .title('Industries')
                            .schemaType('solution')
                            .child(
                                S.documentTypeList('solution')
                                    .title('Industry Solutions')
                                    .filter(
                                        '_type == "solution" && solutionType == "industry"',
                                    )
                                    .defaultOrdering([
                                        {
                                            field: 'internalTitle',
                                            direction: 'asc',
                                        },
                                    ]),
                            ),
                        S.listItem()
                            .title('Channels')
                            .schemaType('solution')
                            .child(
                                S.documentTypeList('solution')
                                    .title('Channel Solutions')
                                    .filter(
                                        '_type == "solution" && solutionType == "channel"',
                                    )
                                    .defaultOrdering([
                                        {
                                            field: 'internalTitle',
                                            direction: 'asc',
                                        },
                                    ]),
                            ),
                        S.listItem()
                            .title('Focus')
                            .schemaType('solution')
                            .child(
                                S.documentTypeList('solution')
                                    .title('Focus Solutions')
                                    .filter(
                                        '_type == "solution" && solutionType == "focus"',
                                    )
                                    .defaultOrdering([
                                        {
                                            field: 'internalTitle',
                                            direction: 'asc',
                                        },
                                    ]),
                            ),
                        S.listItem()
                            .title('Use Cases')
                            .schemaType('solution')
                            .child(
                                S.documentTypeList('solution')
                                    .title('Use Case Solutions')
                                    .filter(
                                        '_type == "solution" && solutionType == "use-case"',
                                    )
                                    .defaultOrdering([
                                        {
                                            field: 'internalTitle',
                                            direction: 'asc',
                                        },
                                    ]),
                            ),
                    ]),
            ),

        // ── Expertise ─────────────────────────────────────────────────────────────
        S.listItem()
            .title('Expertise')
            .icon(StarIcon)
            .schemaType('expertiseStage')
            .child(
                S.documentTypeList('expertiseStage')
                    .title('Expertise Stages')
                    .defaultOrdering([{field: 'order', direction: 'asc'}]),
            ),

        // ── Customization ─────────────────────────────────────────────────────────
        S.listItem()
            .title('Customization')
            .icon(ColorWheelIcon)
            .child(
                S.list()
                    .title('Customization')
                    .items([
                        S.listItem()
                            .title('Browse by Category')
                            .child(
                                S.documentTypeList('customizationCategory')
                                    .title('Categories')
                                    .child((categoryId) =>
                                        S.documentTypeList('customizationType')
                                            .title('Types')
                                            .filter(
                                                'category._ref == $categoryId',
                                            )
                                            .params({categoryId})
                                            .child((typeId) =>
                                                S.documentTypeList('customizationOption')
                                                    .title('Customizations')
                                                    .filter(
                                                        'type._ref == $typeId',
                                                    )
                                                    .params({typeId}),
                                            ),
                                    ),
                            ),
                        S.listItem()
                            .title('All Customizations')
                            .schemaType('customizationOption')
                            .child(
                                S.documentTypeList('customizationOption').title(
                                    'All Customizations',
                                ),
                            ),
                        S.divider(),
                        S.listItem()
                            .title('Taxonomy')
                            .child(
                                S.list()
                                    .title('Customization Taxonomy')
                                    .items([
                                        S.listItem()
                                            .title('Categories')
                                            .schemaType('customizationCategory')
                                            .child(
                                                S.documentTypeList(
                                                    'customizationCategory',
                                                ).title('Categories'),
                                            ),
                                        S.listItem()
                                            .title('Types')
                                            .schemaType('customizationType')
                                            .child(
                                                S.documentTypeList(
                                                    'customizationType',
                                                ).title('Types'),
                                            ),
                                        S.listItem()
                                            .title('Attribute Groups')
                                            .schemaType('property')
                                            .child(
                                                S.documentTypeList(
                                                    'property',
                                                ).title('Attribute Groups'),
                                            ),
                                        S.listItem()
                                            .title('Attributes')
                                            .schemaType('propertyValue')
                                            .child(
                                                S.documentTypeList('propertyValue')
                                                    .title('Attributes')
                                                    .defaultOrdering([
                                                        {
                                                            field: 'property.title',
                                                            direction: 'asc',
                                                        },
                                                        {
                                                            field: 'order',
                                                            direction: 'asc',
                                                        },
                                                    ]),
                                            ),
                                    ]),
                            ),
                    ]),
            ),

        // ── Clients ───────────────────────────────────────────────────────────────
        S.listItem()
            .title('Clients')
            .icon(UserIcon)
            .schemaType('client')
            .child(
                S.documentTypeList('client')
                    .title('Clients')
                    .defaultOrdering([{field: 'name', direction: 'asc'}]),
            ),

        // ── Case Studies ──────────────────────────────────────────────────────────
        ...(options.hideCaseStudies
            ? []
            : [
                  S.listItem()
                      .title('Case Studies')
                      .icon(CaseIcon)
                      .child(
                          S.list()
                              .title('Case Studies')
                              .items([
                                  S.listItem()
                                      .title('Studies')
                                      .icon(CaseIcon)
                                      .schemaType('caseStudy')
                                      .child(
                                          S.documentTypeList('caseStudy')
                                              .title('Case Studies')
                                              .defaultOrdering([
                                                  {field: 'publishedAt', direction: 'desc'},
                                              ]),
                                      ),
                                  S.listItem()
                                      .title('Page Settings')
                                      .icon(CogIcon)
                                      .child(
                                          S.editor()
                                              .id('caseStudiesPage')
                                              .schemaType('caseStudiesPage')
                                              .documentId('caseStudiesPage'),
                                      ),
                              ]),
                      ),
              ]),
    ];
}

export function staticPagesItems(
    S: StructureBuilder,
): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.divider(),

        // Collapsed into a single expandable item so panel 1 stays a constant
        // length as more pages are added. Grouped by purpose inside the panel.
        S.listItem()
            .title('Static Pages')
            .icon(DocumentTextIcon)
            .child(
                S.list()
                    .title('Static Pages')
                    .items([
                        S.divider().title('Company'),

                        S.listItem()
                            .title('About Us')
                            .icon(UserIcon)
                            .child(
                                S.editor()
                                    .id('aboutPage')
                                    .schemaType('aboutPage')
                                    .documentId('aboutPage'),
                            ),

                        S.listItem()
                            .title('Contact Us')
                            .icon(EnvelopeIcon)
                            .child(
                                S.editor()
                                    .id('contactPage')
                                    .schemaType('contactPage')
                                    .documentId('contactPage'),
                            ),

                        S.divider().title('Legal'),

                        S.listItem()
                            .title('Privacy Policy')
                            .icon(LockIcon)
                            .child(
                                S.editor()
                                    .id('privacyPolicy')
                                    .schemaType('privacyPolicy')
                                    .documentId('privacyPolicy'),
                            ),

                        S.listItem()
                            .title('Terms of Service')
                            .icon(DocumentTextIcon)
                            .child(
                                S.editor()
                                    .id('termsOfService')
                                    .schemaType('termsOfService')
                                    .documentId('termsOfService'),
                            ),

                        // ── Long tail of narrative/marketing pages ──────────────────────────
                        // When the generic `page` builder ships, surface it here:
                        // S.divider().title('Marketing'),
                        // S.listItem()
                        //   .title('Pages')
                        //   .icon(DocumentsIcon)
                        //   .schemaType('page')
                        //   .child(S.documentTypeList('page').title('Pages')),
                    ]),
            ),
    ];
}

export function resourcesItems(
    S: StructureBuilder,
): (ListItemBuilder | DividerBuilder)[] {
    return [
        S.divider().title('Resources'),

        // ── Blog (grouped for Admin overview) ────────────────────────────────────
        S.listItem()
            .title('Blog')
            .icon(DocumentTextIcon)
            .child(
                S.list()
                    .title('Blog')
                    .items([
                        S.listItem()
                            .title('Post')
                            .icon(DocumentTextIcon)
                            .schemaType('post')
                            .child(
                                S.documentTypeList('post')
                                    .title('Post')
                                    .defaultOrdering([
                                        {
                                            field: 'publishedAt',
                                            direction: 'desc',
                                        },
                                    ]),
                            ),
                        S.listItem()
                            .title('Category')
                            .icon(FolderIcon)
                            .schemaType('blogCategory')
                            .child(
                                S.documentTypeList('blogCategory')
                                    .title('Category')
                                    .defaultOrdering([
                                        {field: 'title', direction: 'asc'},
                                    ]),
                            ),
                        S.listItem()
                            .title('Topic')
                            .icon(TagIcon)
                            .child(
                                S.documentTypeList('blogTag')
                                    .title('Topic')
                                    .defaultOrdering([
                                        {field: 'title', direction: 'asc'},
                                    ]),
                            ),
                        S.listItem()
                            .title('Author')
                            .icon(UserIcon)
                            .schemaType('author')
                            .child(
                                S.documentTypeList('author').title('Author'),
                            ),
                        S.listItem()
                            .title('Widget')
                            .icon(ComponentIcon)
                            .child(
                                S.documentTypeList('contentWidget').title(
                                    'Widget',
                                ),
                            ),
                    ]),
            ),

        // ── Glossary ──────────────────────────────────────────────────────────────
        S.listItem()
            .title('Glossary')
            .icon(BookIcon)
            .schemaType('glossaryTerm')
            .child(
                S.documentTypeList('glossaryTerm')
                    .title('Glossary')
                    .defaultOrdering([{field: 'term', direction: 'asc'}]),
            ),

        // ── Guides ────────────────────────────────────────────────────────────────
        S.listItem()
            .title('Guides')
            .icon(DocumentTextIcon)
            .schemaType('guide')
            .child(
                S.documentTypeList('guide')
                    .title('Guides')
                    .defaultOrdering([{field: 'title', direction: 'asc'}]),
            ),

    ];
}

interface SettingsOptions {
    blog?: boolean;
    solutions?: boolean;
    /** Show the Media Library inside the Settings section (under the divider). */
    media?: boolean;
}

export function settingsItems(
    S: StructureBuilder,
    context: StructureResolverContext,
    options: SettingsOptions = {},
): (ListItemBuilder | DividerBuilder)[] {
    const showSolutions = WORKSPACE_SETTINGS && options.solutions;

    return [
        S.divider().title('Settings'),

        ...(options.media ? [mediaLibraryItem(S)] : []),

        redirectsDeskItem(S, context),

        ...(showSolutions
            ? [
                  S.listItem()
                      .title('Solutions Settings')
                      .icon(CogIcon)
                      .child(
                          S.editor()
                              .id('solutionsSettings')
                              .schemaType('solutionsSettings')
                              .documentId('solutionsSettings'),
                      ),
              ]
            : []),

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

/** Admin — sees everything, organized by platform architecture */
export const adminStructure = (
    S: StructureBuilder,
    context: StructureResolverContext,
) =>
    S.list()
        .title('PakFactory')
        .items([
            ...coreEntitiesItems(S),
            ...resourcesItems(S),
            globalNavigationItem(S),
            ...settingsItems(S, context, {blog: true, solutions: true}),
        ]);

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

/** Website — all content that makes up the website */
export const websiteStructure = (
    S: StructureBuilder,
    context: StructureResolverContext,
) =>
    S.list()
        .title('Website')
        .items([
            ...coreEntitiesItems(S, {
                // Case Studies shown here (under Core Pages) for the Marketing
                // Website workspace. TODO: drop the "Core Pages" label later.
                label: 'Core Pages',
            }),
            ...staticPagesItems(S),
            mediaLibraryItem(S),
            ...settingsItems(S, context),
        ]);

/** Solutions — industry and use-case solution pages */
export const solutionsStructure = (
    S: StructureBuilder,
    context: StructureResolverContext,
) =>
    S.list()
        .title('Solutions')
        .items([
            ...solutionItems(S),
            ...knowledgeLibraryItems(S),
            ...settingsItems(S, context, {solutions: true}),
        ]);

/** Academy — placeholder until Academy schema is built */
export const academyStructure = (
    S: StructureBuilder,
    context: StructureResolverContext,
) =>
    S.list()
        .title('Academy')
        .items([...settingsItems(S, context)]);

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
            .child(S.documentTypeList('productStyle').title('Product Styles')),
        S.listItem()
            .title('Products')
            .schemaType('product')
            .child(S.documentTypeList('product').title('Products')),
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
            .child(S.documentTypeList('customizationType').title('Customization Types')),
        S.listItem()
            .title('Options')
            .schemaType('customizationOption')
            .child(S.documentTypeList('customizationOption').title('Customization Options')),
        S.listItem()
            .title('Option Groups')
            .schemaType('optionGroup')
            .child(S.documentTypeList('optionGroup').title('Option Groups')),
        S.divider().title('Global'),
        ...propertyGlobalItems(S),
    ];
}

/** Products — Product Line · Product Style · Product (+ Global Property picks) */
export const productsStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Products')
        .items([...productsItems(S)]);

/** Customization — Category · Type · Option · Option Group (+ Global Property picks) */
export const customizationStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Customization')
        .items([...customizationItems(S)]);

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
                S.editor().id('caseStudiesPage').schemaType('caseStudiesPage').documentId('caseStudiesPage'),
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
        .items([...globalItems(S)]);

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
            S.listItem()
                .title('Solutions')
                .icon(BulbOutlineIcon)
                .schemaType('solution')
                .child(
                    S.documentTypeList('solution')
                        .title('Solutions')
                        .defaultOrdering([{field: 'internalTitle', direction: 'asc'}]),
                ),
            S.listItem()
                .title('Solutions Settings')
                .icon(CogIcon)
                .child(
                    S.editor().id('solutionsSettings').schemaType('solutionsSettings').documentId('solutionsSettings'),
                ),
        ]);

/** Expertise workspace (PROD-2330 / D2) — Expertise Stage today; Expertise
 *  Service joins when that type is built. */
export const expertiseStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Expertise')
        .items([
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

/** Main Website workspace (PROD-2330 / D2) — the pages no content area owns.
 *  Today: the four static-page singletons. Home / Content / Legal Page and
 *  Website Navigation wait on Questions for Dev #1 (shared types vs per-page). */
export const mainWebsiteStructure = (
    S: StructureBuilder,
    _context: StructureResolverContext,
) =>
    S.list()
        .title('Main Website')
        .items([
            S.listItem()
                .title('About Page')
                .icon(CogIcon)
                .child(S.editor().id('aboutPage').schemaType('aboutPage').documentId('aboutPage')),
            S.listItem()
                .title('Contact Page')
                .icon(CogIcon)
                .child(S.editor().id('contactPage').schemaType('contactPage').documentId('contactPage')),
            S.listItem()
                .title('Privacy Policy')
                .icon(CogIcon)
                .child(S.editor().id('privacyPolicy').schemaType('privacyPolicy').documentId('privacyPolicy')),
            S.listItem()
                .title('Terms of Service')
                .icon(CogIcon)
                .child(S.editor().id('termsOfService').schemaType('termsOfService').documentId('termsOfService')),
        ]);

// The "All Content" catch-all structure was removed with its workspace (D39
// change (4), PROD-2334): the nine workspaces cover every filed type, and an
// unfiled type is still reachable by search / reference pickers and audited via
// Vision (array::unique(*[]._type)). See sanity.config.ts.

// Default export — Admin (backwards-compatible fallback)
export const structure = adminStructure;
