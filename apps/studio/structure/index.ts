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
  BookIcon,
  BulbOutlineIcon,
  CaseIcon,
  EnvelopeIcon,
  HelpCircleIcon,
  HomeIcon,
  ImagesIcon,
  LockIcon,
  StarIcon,
} from '@sanity/icons'
import type { DividerBuilder, ListItemBuilder, StructureBuilder } from 'sanity/structure'
import { MediaToolRedirect } from '../components/MediaToolRedirect'
import { BLOG_HOME_PAGE_IDS, SUPPORTED_LANGUAGES } from '../lib/languages'
import { TAG_GROUPS, TAG_GROUP_UNGROUPED } from '../schemas/blogTag'

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAG
// Set to false to revert all workspaces to Global Settings only.
// ─────────────────────────────────────────────────────────────────────────────
const WORKSPACE_SETTINGS = true

/** Flip true when design ships landing/static Studio lists (ADR-009 Studio UX gate). */
const BLOG_STUDIO_LANDING_PAGES = false

function mediaLibraryItem(S: StructureBuilder): ListItemBuilder {
  return S.listItem()
    .id('mediaLibrary')
    .title('Media Library')
    .icon(ImagesIcon)
    .child(S.component(MediaToolRedirect).title('Media Library'))
}

function blogHomepageItem(S: StructureBuilder): ListItemBuilder {
  return S.listItem()
    .title('Homepage')
    .icon(HomeIcon)
    .child(
      S.list()
        .title('Homepage')
        .items(
          SUPPORTED_LANGUAGES.map(({ id, title }) =>
            S.listItem()
              .title(`Homepage (${title})`)
              .id(`blogHomePage-${id}`)
              .child(
                S.editor()
                  .id(BLOG_HOME_PAGE_IDS[id])
                  .schemaType('blogPage')
                  .documentId(BLOG_HOME_PAGE_IDS[id])
              )
          )
        )
    )
}

function blogPagesFolder(S: StructureBuilder): ListItemBuilder {
  const pageItems: ListItemBuilder[] = [blogHomepageItem(S)]

  if (BLOG_STUDIO_LANDING_PAGES) {
    pageItems.push(
      S.listItem()
        .title('Landing pages')
        .icon(DocumentsIcon)
        .schemaType('blogPage')
        .child(
          S.documentTypeList('blogPage')
            .title('Landing pages')
            .filter('_type == "blogPage" && pageRole == "landing"')
            .defaultOrdering([{ field: 'title', direction: 'asc' }])
        ),
      S.listItem()
        .title('Static pages')
        .icon(DocumentTextIcon)
        .schemaType('blogPage')
        .child(
          S.documentTypeList('blogPage')
            .title('Static pages')
            .filter('_type == "blogPage" && pageRole == "static"')
            .defaultOrdering([{ field: 'title', direction: 'asc' }])
        )
    )
  }

  return S.listItem()
    .title('Pages')
    .icon(DocumentsIcon)
    .child(
      S.list()
        .title('Pages')
        .items(pageItems)
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED BUILDING BLOCKS
// Each function returns an array of list items / dividers so they can be
// composed freely into any workspace structure.
// ─────────────────────────────────────────────────────────────────────────────

export function blogItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
  return [
    S.listItem()
      .title('Posts')
      .icon(DocumentTextIcon)
      .schemaType('post')
      .child(
        S.documentTypeList('post')
          .title('Posts')
          .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
      ),

    S.listItem()
      .title('Categories')
      .icon(FolderIcon)
      .schemaType('blogCategory')
      .child(
        S.documentTypeList('blogCategory')
          .title('Categories')
          .defaultOrdering([{ field: 'order', direction: 'asc' }])
      ),

    S.listItem()
      .title('Authors')
      .icon(UserIcon)
      .schemaType('author')
      .child(S.documentTypeList('author').title('Authors')),

    S.listItem()
      .title('Tags')
      .icon(TagIcon)
      .child(
        S.list()
          .title('Tags')
          .items([
            // One sub-list per classification axis (tagGroup). Tags stay flat;
            // this only groups how they're browsed in Studio.
            ...TAG_GROUPS.map(({ value, title }) =>
              S.listItem()
                .title(title)
                .icon(TagIcon)
                .schemaType('blogTag')
                .child(
                  S.documentTypeList('blogTag')
                    .title(title)
                    .filter('_type == "blogTag" && tagGroup == $tagGroup')
                    .params({ tagGroup: value })
                    .defaultOrdering([
                      { field: 'order', direction: 'asc' },
                      { field: 'title', direction: 'asc' },
                    ])
                )
            ),

            S.divider(),

            // Catch-all for tags with no axis assigned yet (un-backfilled docs).
            S.listItem()
              .title('Ungrouped')
              .schemaType('blogTag')
              .child(
                S.documentTypeList('blogTag')
                  .title('Ungrouped')
                  .filter('_type == "blogTag" && (!defined(tagGroup) || tagGroup == $ungrouped)')
                  .params({ ungrouped: TAG_GROUP_UNGROUPED })
                  .defaultOrdering([{ field: 'title', direction: 'asc' }])
              ),

            S.listItem()
              .title('All Tags')
              .schemaType('blogTag')
              .child(
                S.documentTypeList('blogTag')
                  .title('All Tags')
                  .defaultOrdering([{ field: 'title', direction: 'asc' }])
              ),
          ])
      ),

    S.listItem()
      .title('Widgets')
      .icon(ComponentIcon)
      .child(
        S.list()
          .title('Widgets')
          .items([
            S.listItem()
              .title('Blocks')
              .schemaType('contentWidget')
              .child(
                S.documentTypeList('contentWidget')
                  .title('Blocks')
                  .filter('widgetType == "cta"')
                  .defaultOrdering([{ field: 'internalTitle', direction: 'asc' }])
              ),

            S.listItem()
              .title('Product Cards')
              .schemaType('contentWidget')
              .child(
                S.documentTypeList('contentWidget')
                  .title('Product Cards')
                  .filter('widgetType == "product-card"')
                  .defaultOrdering([{ field: 'internalTitle', direction: 'asc' }])
              ),

            S.divider(),

            S.listItem()
              .title('All Widgets')
              .schemaType('contentWidget')
              .child(
                S.documentTypeList('contentWidget')
                  .title('All Widgets')
                  .defaultOrdering([
                    { field: 'widgetType', direction: 'asc' },
                    { field: 'internalTitle', direction: 'asc' },
                  ])
              ),
          ])
      ),

    blogPagesFolder(S),

  ]
}

export function websiteItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
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
                  .filter('pageType == "home"')
              ),
            S.listItem()
              .title('Category Landing Pages')
              .child(
                S.documentTypeList('page')
                  .title('Category Landing Pages')
                  .filter('pageType == "landing-category"')
              ),
            S.listItem()
              .title('Type Landing Pages')
              .child(
                S.documentTypeList('page')
                  .title('Type Landing Pages')
                  .filter('pageType == "landing-type"')
              ),
            S.listItem()
              .title('Industry Pages')
              .child(
                S.documentTypeList('page')
                  .title('Industry Pages')
                  .filter('pageType == "landing-industry"')
              ),
            S.listItem()
              .title('Service Pages')
              .child(
                S.documentTypeList('page')
                  .title('Service Pages')
                  .filter('pageType == "landing-service"')
              ),
            S.listItem()
              .title('Static Pages')
              .child(
                S.documentTypeList('page')
                  .title('Static Pages')
                  .filter('pageType == "static"')
              ),
          ])
      ),
  ]
}

export function knowledgeLibraryItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
  return [
    S.divider().title('Knowledge Library'),

    // ── Capabilities ──────────────────────────────────────────────────────────
    S.listItem()
      .title('Capabilities')
      .icon(ColorWheelIcon)
      .child(
        S.list()
          .title('Capabilities')
          .items([
            S.listItem()
              .title('Browse by Category')
              .child(
                S.documentTypeList('capabilityCategory')
                  .title('Categories')
                  .child((categoryId) =>
                    S.documentTypeList('capabilityType')
                      .title('Types')
                      .filter('category._ref == $categoryId')
                      .params({ categoryId })
                      .child((typeId) =>
                        S.documentTypeList('capability')
                          .title('Capabilities')
                          .filter('type._ref == $typeId')
                          .params({ typeId })
                      )
                  )
              ),

            S.listItem()
              .title('All Capabilities')
              .schemaType('capability')
              .child(S.documentTypeList('capability').title('All Capabilities')),

            S.divider(),

            S.listItem()
              .title('Taxonomy')
              .child(
                S.list()
                  .title('Capability Taxonomy')
                  .items([
                    S.listItem()
                      .title('Capability Categories')
                      .schemaType('capabilityCategory')
                      .child(
                        S.documentTypeList('capabilityCategory').title('Capability Categories')
                      ),
                    S.listItem()
                      .title('Capability Types')
                      .schemaType('capabilityType')
                      .child(
                        S.documentTypeList('capabilityType').title('Capability Types')
                      ),
                    S.listItem()
                      .title('Attribute Groups')
                      .schemaType('attributeGroup')
                      .child(
                        S.documentTypeList('attributeGroup').title('Attribute Groups')
                      ),
                    S.listItem()
                      .title('Attributes')
                      .schemaType('attribute')
                      .child(
                        S.documentTypeList('attribute')
                          .title('Attributes')
                          .defaultOrdering([
                            { field: 'attributeGroup.title', direction: 'asc' },
                            { field: 'order', direction: 'asc' },
                          ])
                      ),
                  ])
              ),
          ])
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
              .child(S.documentTypeList('product').title('All Products')),

            S.listItem()
              .title('Standard')
              .child(
                S.documentTypeList('productCategory')
                  .title('Product Lines')
                  .child((categoryId) =>
                    S.documentTypeList('productStyleCategory')
                      .title('Product Styles')
                      .filter('productCategory._ref == $categoryId')
                      .params({ categoryId })
                      .child((styleId) =>
                        S.documentTypeList('product')
                          .title('Products')
                          .filter(
                            '$styleId in productStyleCategories[]._ref && (primaryClassification == "standard" || primaryClassification == "both")'
                          )
                          .params({ styleId })
                      )
                  )
              ),

            S.listItem()
              .title('Industry')
              .child(
                S.documentTypeList('industry')
                  .title('Industries')
                  .child((industryId) =>
                    S.documentTypeList('industryCategory')
                      .title('Industry Segments')
                      .filter('industry._ref == $industryId')
                      .params({ industryId })
                      .child((industryCategoryId) =>
                        S.documentTypeList('product')
                          .title('Products')
                          .filter(
                            '$industryCategoryId in industryCategories[]._ref && (primaryClassification == "industry" || primaryClassification == "both")'
                          )
                          .params({ industryCategoryId })
                      )
                  )
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
                              .title('Product Lines')
                              .schemaType('productCategory')
                              .child(
                                S.documentTypeList('productCategory').title('Product Lines')
                              ),
                            S.listItem()
                              .title('Product Styles')
                              .schemaType('productStyleCategory')
                              .child(
                                S.documentTypeList('productStyleCategory').title('Product Styles')
                              ),
                            S.listItem()
                              .title('Industries')
                              .schemaType('industry')
                              .child(S.documentTypeList('industry').title('Industries')),
                            S.listItem()
                              .title('Industry Segments')
                              .schemaType('industryCategory')
                              .child(
                                S.documentTypeList('industryCategory').title('Industry Segments')
                              ),
                          ])
                      ),

                    S.listItem()
                      .title('Terms')
                      .child(
                        S.list()
                          .title('Terms')
                          .items([
                            S.listItem()
                              .title('Use Cases')
                              .schemaType('useCase')
                              .child(S.documentTypeList('useCase').title('Use Cases')),
                          ])
                      ),
                  ])
              ),
          ])
      ),
  ]
}

export function solutionItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
  return [
    S.divider().title('Solutions'),

    S.listItem()
      .title('Solutions')
      .icon(BulbOutlineIcon)
      .schemaType('solution')
      .child(
        S.documentTypeList('solution')
          .title('Solutions')
          .defaultOrdering([{ field: 'internalTitle', direction: 'asc' }])
      ),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN-SPECIFIC BUILDING BLOCKS
// Used only in adminStructure. Individual workspaces use their own flat items.
// ─────────────────────────────────────────────────────────────────────────────

interface CoreEntitiesOptions {
  hideCaseStudies?: boolean
  label?: string
}

export function coreEntitiesItems(
  S: StructureBuilder,
  options: CoreEntitiesOptions = {}
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
              .child(S.documentTypeList('product').title('All Products')),
            S.listItem()
              .title('Standard')
              .child(
                S.documentTypeList('productCategory')
                  .title('Product Lines')
                  .child((categoryId) =>
                    S.documentTypeList('productStyleCategory')
                      .title('Product Styles')
                      .filter('productCategory._ref == $categoryId')
                      .params({ categoryId })
                      .child((styleId) =>
                        S.documentTypeList('product')
                          .title('Products')
                          .filter(
                            '$styleId in productStyleCategories[]._ref && (primaryClassification == "standard" || primaryClassification == "both")'
                          )
                          .params({ styleId })
                      )
                  )
              ),
            S.listItem()
              .title('Industry')
              .child(
                S.documentTypeList('industry')
                  .title('Industries')
                  .child((industryId) =>
                    S.documentTypeList('industryCategory')
                      .title('Industry Segments')
                      .filter('industry._ref == $industryId')
                      .params({ industryId })
                      .child((industryCategoryId) =>
                        S.documentTypeList('product')
                          .title('Products')
                          .filter(
                            '$industryCategoryId in industryCategories[]._ref && (primaryClassification == "industry" || primaryClassification == "both")'
                          )
                          .params({ industryCategoryId })
                      )
                  )
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
                      .schemaType('productCategory')
                      .child(S.documentTypeList('productCategory').title('Product Lines')),
                    S.listItem()
                      .title('Product Styles')
                      .schemaType('productStyleCategory')
                      .child(S.documentTypeList('productStyleCategory').title('Product Styles')),
                    S.listItem()
                      .title('Use Cases')
                      .schemaType('useCase')
                      .child(S.documentTypeList('useCase').title('Use Cases')),
                  ])
              ),
          ])
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
                  .defaultOrdering([{ field: 'internalTitle', direction: 'asc' }])
              ),
            S.listItem()
              .title('Industries')
              .schemaType('solution')
              .child(
                S.documentTypeList('solution')
                  .title('Industry Solutions')
                  .filter('_type == "solution" && solutionType == "industry"')
                  .defaultOrdering([{ field: 'internalTitle', direction: 'asc' }])
              ),
            S.listItem()
              .title('Use Cases')
              .schemaType('solution')
              .child(
                S.documentTypeList('solution')
                  .title('Use Case Solutions')
                  .filter('_type == "solution" && solutionType == "use-case"')
                  .defaultOrdering([{ field: 'internalTitle', direction: 'asc' }])
              ),
          ])
      ),

    // ── Expertise ─────────────────────────────────────────────────────────────
    S.listItem()
      .title('Expertise')
      .icon(StarIcon)
      .schemaType('expertiseStage')
      .child(
        S.documentTypeList('expertiseStage')
          .title('Expertise Stages')
          .defaultOrdering([{ field: 'order', direction: 'asc' }])
      ),

    // ── Capabilities ──────────────────────────────────────────────────────────
    S.listItem()
      .title('Capabilities')
      .icon(ColorWheelIcon)
      .child(
        S.list()
          .title('Capabilities')
          .items([
            S.listItem()
              .title('Browse by Category')
              .child(
                S.documentTypeList('capabilityCategory')
                  .title('Categories')
                  .child((categoryId) =>
                    S.documentTypeList('capabilityType')
                      .title('Types')
                      .filter('category._ref == $categoryId')
                      .params({ categoryId })
                      .child((typeId) =>
                        S.documentTypeList('capability')
                          .title('Capabilities')
                          .filter('type._ref == $typeId')
                          .params({ typeId })
                      )
                  )
              ),
            S.listItem()
              .title('All Capabilities')
              .schemaType('capability')
              .child(S.documentTypeList('capability').title('All Capabilities')),
            S.divider(),
            S.listItem()
              .title('Taxonomy')
              .child(
                S.list()
                  .title('Capability Taxonomy')
                  .items([
                    S.listItem()
                      .title('Categories')
                      .schemaType('capabilityCategory')
                      .child(S.documentTypeList('capabilityCategory').title('Categories')),
                    S.listItem()
                      .title('Types')
                      .schemaType('capabilityType')
                      .child(S.documentTypeList('capabilityType').title('Types')),
                    S.listItem()
                      .title('Attribute Groups')
                      .schemaType('attributeGroup')
                      .child(S.documentTypeList('attributeGroup').title('Attribute Groups')),
                    S.listItem()
                      .title('Attributes')
                      .schemaType('attribute')
                      .child(
                        S.documentTypeList('attribute')
                          .title('Attributes')
                          .defaultOrdering([
                            { field: 'attributeGroup.title', direction: 'asc' },
                            { field: 'order', direction: 'asc' },
                          ])
                      ),
                  ])
              ),
          ])
      ),

    // ── Resources (Case Studies — rename pending confirmation) ────────────────
    ...(options.hideCaseStudies
      ? []
      : [
          S.listItem()
            .title('Case Studies')
            .icon(CaseIcon)
            .schemaType('caseStudy')
            .child(
              S.documentTypeList('caseStudy')
                .title('Case Studies')
                .defaultOrdering([{ field: 'title', direction: 'asc' }])
            ),
        ]),
  ]
}

export function staticPagesItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
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
                S.editor().id('aboutPage').schemaType('aboutPage').documentId('aboutPage')
              ),

            S.listItem()
              .title('Contact Us')
              .icon(EnvelopeIcon)
              .child(
                S.editor().id('contactPage').schemaType('contactPage').documentId('contactPage')
              ),

            S.divider().title('Legal'),

            S.listItem()
              .title('Privacy Policy')
              .icon(LockIcon)
              .child(
                S.editor().id('privacyPolicy').schemaType('privacyPolicy').documentId('privacyPolicy')
              ),

            S.listItem()
              .title('Terms of Service')
              .icon(DocumentTextIcon)
              .child(
                S.editor()
                  .id('termsOfService')
                  .schemaType('termsOfService')
                  .documentId('termsOfService')
              ),

            // ── Long tail of narrative/marketing pages ──────────────────────────
            // When the generic `page` builder ships, surface it here:
            // S.divider().title('Marketing'),
            // S.listItem()
            //   .title('Pages')
            //   .icon(DocumentsIcon)
            //   .schemaType('page')
            //   .child(S.documentTypeList('page').title('Pages')),
          ])
      ),
  ]
}

export function resourcesItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
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
              .title('Posts')
              .icon(DocumentTextIcon)
              .schemaType('post')
              .child(
                S.documentTypeList('post')
                  .title('Posts')
                  .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
              ),
            S.listItem()
              .title('Categories')
              .icon(FolderIcon)
              .schemaType('blogCategory')
              .child(
                S.documentTypeList('blogCategory')
                  .title('Categories')
                  .defaultOrdering([{ field: 'order', direction: 'asc' }])
              ),
            S.listItem()
              .title('Authors')
              .icon(UserIcon)
              .schemaType('author')
              .child(S.documentTypeList('author').title('Authors')),
            S.listItem()
              .title('Tags')
              .icon(TagIcon)
              .child(
                S.documentTypeList('blogTag')
                  .title('Tags')
                  .defaultOrdering([{ field: 'title', direction: 'asc' }])
              ),
            S.listItem()
              .title('Widgets')
              .icon(ComponentIcon)
              .child(S.documentTypeList('contentWidget').title('Widgets')),
          ])
      ),

    // ── Glossary ──────────────────────────────────────────────────────────────
    S.listItem()
      .title('Glossary')
      .icon(BookIcon)
      .schemaType('glossaryTerm')
      .child(
        S.documentTypeList('glossaryTerm')
          .title('Glossary')
          .defaultOrdering([{ field: 'term', direction: 'asc' }])
      ),

    // ── Guides ────────────────────────────────────────────────────────────────
    S.listItem()
      .title('Guides')
      .icon(DocumentTextIcon)
      .schemaType('guide')
      .child(
        S.documentTypeList('guide')
          .title('Guides')
          .defaultOrdering([{ field: 'title', direction: 'asc' }])
      ),

    // ── Help Desk ─────────────────────────────────────────────────────────────
    S.listItem()
      .title('Help Desk')
      .icon(HelpCircleIcon)
      .schemaType('helpArticle')
      .child(
        S.documentTypeList('helpArticle')
          .title('Help Articles')
          .defaultOrdering([{ field: 'title', direction: 'asc' }])
      ),

    // ── Case Studies ──────────────────────────────────────────────────────────
    S.listItem()
      .title('Case Studies')
      .icon(CaseIcon)
      .schemaType('caseStudy')
      .child(
        S.documentTypeList('caseStudy')
          .title('Case Studies')
          .defaultOrdering([{ field: 'title', direction: 'asc' }])
      ),
  ]
}

interface SettingsOptions {
  blog?: boolean
  solutions?: boolean
}

export function settingsItems(
  S: StructureBuilder,
  options: SettingsOptions = {}
): (ListItemBuilder | DividerBuilder)[] {
  const showBlog = WORKSPACE_SETTINGS && options.blog
  const showSolutions = WORKSPACE_SETTINGS && options.solutions

  return [
    S.divider().title('Settings'),

    S.listItem()
      .title('Redirects')
      .icon(ArrowRightIcon)
      .child(
        S.list()
          .title('Redirects')
          .items([
            S.listItem()
              .title('All')
              .schemaType('redirect')
              .child(
                S.documentTypeList('redirect')
                  .title('All Redirects')
                  .defaultOrdering([
                    { field: 'channel', direction: 'asc' },
                    { field: 'isActive', direction: 'desc' },
                    { field: '_updatedAt', direction: 'desc' },
                  ])
              ),

            S.divider(),

            S.listItem()
              .title('Blog')
              .schemaType('redirect')
              .child(
                S.documentTypeList('redirect')
                  .title('Blog Redirects')
                  .filter('_type == "redirect" && (channel == "blog" || !defined(channel))')
                  .defaultOrdering([{ field: 'isActive', direction: 'desc' }, { field: '_updatedAt', direction: 'desc' }])
              ),

            S.listItem()
              .title('Website')
              .schemaType('redirect')
              .child(
                S.documentTypeList('redirect')
                  .title('Website Redirects')
                  .filter('_type == "redirect" && channel == "website"')
                  .defaultOrdering([{ field: 'isActive', direction: 'desc' }, { field: '_updatedAt', direction: 'desc' }])
              ),

            S.listItem()
              .title('Products')
              .schemaType('redirect')
              .child(
                S.documentTypeList('redirect')
                  .title('Product Redirects')
                  .filter('_type == "redirect" && channel == "products"')
                  .defaultOrdering([{ field: 'isActive', direction: 'desc' }, { field: '_updatedAt', direction: 'desc' }])
              ),

            S.listItem()
              .title('Solutions')
              .schemaType('redirect')
              .child(
                S.documentTypeList('redirect')
                  .title('Solution Redirects')
                  .filter('_type == "redirect" && channel == "solutions"')
                  .defaultOrdering([{ field: 'isActive', direction: 'desc' }, { field: '_updatedAt', direction: 'desc' }])
              ),

            S.listItem()
              .title('Expertise')
              .schemaType('redirect')
              .child(
                S.documentTypeList('redirect')
                  .title('Expertise Redirects')
                  .filter('_type == "redirect" && channel == "expertise"')
                  .defaultOrdering([{ field: 'isActive', direction: 'desc' }, { field: '_updatedAt', direction: 'desc' }])
              ),
          ])
      ),

    ...(showBlog
      ? [
          S.listItem()
            .title('Blog Settings')
            .icon(CogIcon)
            .child(
              S.editor()
                .id('blogSettings')
                .schemaType('blogSettings')
                .documentId('blogSettings')
            ),
        ]
      : []),

    ...(showSolutions
      ? [
          S.listItem()
            .title('Solutions Settings')
            .icon(CogIcon)
            .child(
              S.editor()
                .id('solutionsSettings')
                .schemaType('solutionsSettings')
                .documentId('solutionsSettings')
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
          .documentId('settings')
      ),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKSPACE STRUCTURES
// Compose the building blocks per workspace.
// ─────────────────────────────────────────────────────────────────────────────

/** Admin — sees everything, organized by platform architecture */
export const adminStructure = (S: StructureBuilder) =>
  S.list()
    .title('PakFactory')
    .items([
      ...coreEntitiesItems(S, { hideCaseStudies: true }),
      ...resourcesItems(S),
      ...settingsItems(S, { blog: true, solutions: true }),
    ])

/** Blog — editorial team */
export const blogStructure = (S: StructureBuilder) =>
  S.list()
    .title('Blog')
    .items([
      ...blogItems(S),
      mediaLibraryItem(S),
      ...settingsItems(S, { blog: true }),
    ])

/** Website — all content that makes up the website */
export const websiteStructure = (S: StructureBuilder) =>
  S.list()
    .title('Website')
    .items([
      ...coreEntitiesItems(S, { hideCaseStudies: true, label: 'Core Pages' }),
      ...staticPagesItems(S),
      mediaLibraryItem(S),
      ...settingsItems(S),
    ])

/** Solutions — industry and use-case solution pages */
export const solutionsStructure = (S: StructureBuilder) =>
  S.list()
    .title('Solutions')
    .items([
      ...solutionItems(S),
      ...knowledgeLibraryItems(S),
      ...settingsItems(S, { solutions: true }),
    ])

/** Academy — placeholder until Academy schema is built */
export const academyStructure = (S: StructureBuilder) =>
  S.list()
    .title('Academy')
    .items([
      ...settingsItems(S),
    ])

// Default export — Admin (backwards-compatible fallback)
export const structure = adminStructure
