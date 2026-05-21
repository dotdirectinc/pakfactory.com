import {
  CogIcon,
  ComponentIcon,
  DocumentTextIcon,
  FolderIcon,
  PackageIcon,
  ColorWheelIcon,
  TagIcon,
  UserIcon,
} from '@sanity/icons'
import type { DividerBuilder, ListItemBuilder, StructureBuilder } from 'sanity/structure'

// ─────────────────────────────────────────────────────────────────────────────
// SHARED BUILDING BLOCKS
// Each function returns an array of list items / dividers so they can be
// composed freely into any workspace structure.
// ─────────────────────────────────────────────────────────────────────────────

export function blogItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
  return [
    S.divider().title('Blog'),

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
      .schemaType('blogTag')
      .child(
        S.documentTypeList('blogTag')
          .title('Tags')
          .defaultOrdering([{ field: 'title', direction: 'asc' }])
      ),

    S.listItem()
      .title('Widgets')
      .icon(ComponentIcon)
      .child(
        S.list()
          .title('Widgets')
          .items([
            S.listItem()
              .title('CTA Blocks')
              .schemaType('contentWidget')
              .child(
                S.documentTypeList('contentWidget')
                  .title('CTA Blocks')
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

export function settingsItems(S: StructureBuilder): (ListItemBuilder | DividerBuilder)[] {
  return [
    S.divider().title('Settings'),

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

/** Admin — sees everything */
export const adminStructure = (S: StructureBuilder) =>
  S.list()
    .title('PakFactory')
    .items([
      ...blogItems(S),
      ...websiteItems(S),
      ...knowledgeLibraryItems(S),
      ...settingsItems(S),
    ])

/** Blog — editorial team */
export const blogStructure = (S: StructureBuilder) =>
  S.list()
    .title('Blog')
    .items([
      ...blogItems(S),
      ...knowledgeLibraryItems(S),
      ...settingsItems(S),
    ])

/** Website — marketing / web team */
export const websiteStructure = (S: StructureBuilder) =>
  S.list()
    .title('Website')
    .items([
      ...websiteItems(S),
      ...knowledgeLibraryItems(S),
      ...settingsItems(S),
    ])

/** Academy — placeholder until Academy schema is built */
export const academyStructure = (S: StructureBuilder) =>
  S.list()
    .title('Academy')
    .items([
      ...knowledgeLibraryItems(S),
      ...settingsItems(S),
    ])

// Default export — Admin (backwards-compatible fallback)
export const structure = adminStructure
