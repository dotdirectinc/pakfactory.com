import {defineConfig, type Template} from 'sanity';
import {structureTool, type DefaultDocumentNodeResolver} from 'sanity/structure';
import {visionTool} from '@sanity/vision';
import {assist} from '@sanity/assist';
import {presentationTool} from 'sanity/presentation';
import {schemaTypes} from '@pakfactory/sanity/schemas';
import {ProductCollectionProductsView} from './components/ProductCollectionProductsView';
import {ProductPageCollectionsView} from './components/ProductPageCollectionsView';
import {ProductCapabilitiesView} from './components/ProductCapabilitiesView';
import {
    PRODUCT_FOR_COLLECTION_TEMPLATE_ID,
    PRODUCT_FOR_LANDING_PAGE_TEMPLATE_ID,
    CAPABILITY_CATEGORY_MATERIAL_TEMPLATE_ID,
    CAPABILITY_CATEGORY_FINISH_TEMPLATE_ID,
} from './templateIds';

const productForCollectionTemplate: Template<{collectionId?: string}> = {
    id: PRODUCT_FOR_COLLECTION_TEMPLATE_ID,
    title: 'Product in this collection',
    schemaType: 'product',
    parameters: [{name: 'collectionId', type: 'string', title: 'Collection'}],
    value: (params: {collectionId?: string}) => ({
        primaryCollection: params?.collectionId
            ? {_type: 'reference', _ref: params.collectionId}
            : undefined,
    }),
};

const capabilityCategoryMaterialTemplate: Template = {
    id: CAPABILITY_CATEGORY_MATERIAL_TEMPLATE_ID,
    title: 'Material',
    schemaType: 'capabilityCategory',
    value: {category: 'material'},
};

const capabilityCategoryFinishTemplate: Template = {
    id: CAPABILITY_CATEGORY_FINISH_TEMPLATE_ID,
    title: 'Finish',
    schemaType: 'capabilityCategory',
    value: {category: 'finish'},
};

const productForLandingPageTemplate: Template<{landingPageId?: string}> = {
    id: PRODUCT_FOR_LANDING_PAGE_TEMPLATE_ID,
    title: 'Product on this landing page',
    schemaType: 'product',
    parameters: [{name: 'landingPageId', type: 'string', title: 'Landing page'}],
    value: (params: {landingPageId?: string}) => ({
        primaryLandingPage: params?.landingPageId
            ? {_type: 'reference', _ref: params.landingPageId}
            : undefined,
    }),
};

const projectId =
    process.env.SANITY_STUDIO_PROJECT_ID ||
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    '';
const previewOrigin =
    process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:3000';
const dataset =
    process.env.SANITY_STUDIO_DATASET ||
    process.env.NEXT_PUBLIC_SANITY_DATASET ||
    'production';

/** GROQ API version for Structure Builder `documentList().filter()` (required by Sanity). */
const sanityStructureApiVersion =
    process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-09-25';

const defaultDocumentNode: DefaultDocumentNodeResolver = (S, context) => {
    if (context.schemaType === 'productCollection') {
        return S.document().views([
            S.view.form(),
            S.view
                .component(ProductCollectionProductsView)
                .id('collection-products')
                .title('Products'),
        ]);
    }
    if (context.schemaType === 'product') {
        return S.document().views([
            S.view.form(),
            S.view
                .component(ProductCapabilitiesView)
                .id('product-capabilities')
                .title('Capabilities'),
        ]);
    }
    if (context.schemaType === 'productPage') {
        return S.document().views([
            S.view.form(),
            S.view
                .component(ProductPageCollectionsView)
                .id('page-collections')
                .title('Collections'),
        ]);
    }
    return S.document();
};

export default defineConfig({
    name: 'pakfactory',
    title: 'PakFactory Studio',
    projectId,
    dataset,
    plugins: [
        structureTool({
            defaultDocumentNode,
            structure: (S) =>
                S.list()
                    .title('PakFactory')
                    .items([
                        S.divider().title('E-Commerce'),

                        S.listItem()
                            .id('pagesGroup')
                            .title('Pages')
                            .child(
                                S.list()
                                    .title('Pages')
                                    .items([
                                        S.listItem()
                                            .id('homeSingleton')
                                            .title('Home page')
                                            .child(
                                                S.document()
                                                    .schemaType('homePage')
                                                    .documentId('homePage')
                                                    .title('Home page'),
                                            ),
                                        S.documentTypeListItem(
                                            'capabilityPage',
                                        ).title('Capability pages'),
                                        S.listItem()
                                            .id('productPagesGroup')
                                            .title('Product pages')
                                            .child(
                                                S.list()
                                                    .title('Product pages')
                                                    .items([
                                                        S.listItem()
                                                            .id('productPages-all')
                                                            .title('All')
                                                            .child(
                                                                S.documentList()
                                                                    .apiVersion(
                                                                        sanityStructureApiVersion,
                                                                    )
                                                                    .id(
                                                                        'productPages-all-list',
                                                                    )
                                                                    .title(
                                                                        'All product pages',
                                                                    )
                                                                    .schemaType(
                                                                        'productPage',
                                                                    )
                                                                    .filter(
                                                                        '_type == "productPage"',
                                                                    ),
                                                            ),
                                                        S.listItem()
                                                            .id(
                                                                'productPages-standard',
                                                            )
                                                            .title('Standard')
                                                            .child(
                                                                S.documentList()
                                                                    .apiVersion(
                                                                        sanityStructureApiVersion,
                                                                    )
                                                                    .id(
                                                                        'productPages-standard-list',
                                                                    )
                                                                    .title(
                                                                        'Standard product pages',
                                                                    )
                                                                    .schemaType(
                                                                        'productPage',
                                                                    )
                                                                    .filter(
                                                                        '_type == "productPage" && solutionType == "standard"',
                                                                    ),
                                                            ),
                                                        S.listItem()
                                                            .id(
                                                                'productPages-industry',
                                                            )
                                                            .title('Industry')
                                                            .child(
                                                                S.documentList()
                                                                    .apiVersion(
                                                                        sanityStructureApiVersion,
                                                                    )
                                                                    .id(
                                                                        'productPages-industry-list',
                                                                    )
                                                                    .title(
                                                                        'Industry product pages',
                                                                    )
                                                                    .schemaType(
                                                                        'productPage',
                                                                    )
                                                                    .filter(
                                                                        '_type == "productPage" && solutionType == "industry"',
                                                                    ),
                                                            ),
                                                    ]),
                                            ),
                                        S.documentTypeListItem(
                                            'staticPage',
                                        ).title('Static pages'),
                                    ]),
                            ),
                        S.documentTypeListItem('productCollection').title(
                            'Collections',
                        ),
                        S.documentTypeListItem('siteSettings').title(
                            'Site settings',
                        ),
                        S.divider().title('Blog'),
                        S.documentTypeListItem('post').title('Posts'),
                        S.documentTypeListItem('author').title('Authors'),

                        S.divider().title('Library / Catalog'),
                        S.listItem()
                            .id('productsGroup')
                            .title('Products')
                            .child(
                                S.list()
                                    .title('Products')
                                    .items([
                                        S.listItem()
                                            .id('products-all')
                                            .title('All')
                                            .child(
                                                S.documentList()
                                                    .apiVersion(
                                                        sanityStructureApiVersion,
                                                    )
                                                    .id('products-all-list')
                                                    .title('All products')
                                                    .schemaType('product')
                                                    .filter(
                                                        '_type == "product"',
                                                    ),
                                            ),
                                        S.listItem()
                                            .id('products-standard')
                                            .title('Standard')
                                            .child(
                                                S.documentList()
                                                    .apiVersion(
                                                        sanityStructureApiVersion,
                                                    )
                                                    .id(
                                                        'products-standard-list',
                                                    )
                                                    .title(
                                                        'Standard program products',
                                                    )
                                                    .schemaType('product')
                                                    .filter(
                                                        '_type == "product" && primaryLandingPage->_type == "productPage" && primaryLandingPage->solutionType == "standard"',
                                                    ),
                                            ),
                                        S.listItem()
                                            .id('products-industry')
                                            .title('Industry')
                                            .child(
                                                S.documentList()
                                                    .apiVersion(
                                                        sanityStructureApiVersion,
                                                    )
                                                    .id(
                                                        'products-industry-list',
                                                    )
                                                    .title(
                                                        'Industry program products',
                                                    )
                                                    .schemaType('product')
                                                    .filter(
                                                        '_type == "product" && primaryLandingPage->_type == "productPage" && primaryLandingPage->solutionType == "industry"',
                                                    ),
                                            ),
                                    ]),
                            ),
                        S.listItem()
                            .id('capabilitiesGroup')
                            .title('Capabilities')
                            .child(
                                S.list()
                                    .title('Capabilities')
                                    .items([
                                        S.listItem()
                                            .id('capabilityCategoriesGroup')
                                            .title('Categories')
                                            .child(
                                                S.list()
                                                    .title('Categories')
                                                    .items([
                                                        S.listItem()
                                                            .id('capabilityCategories-material')
                                                            .title('Material')
                                                            .child(
                                                                S.documentList()
                                                                    .apiVersion(
                                                                        sanityStructureApiVersion,
                                                                    )
                                                                    .id('capabilityCategories-material-list')
                                                                    .title('Material')
                                                                    .schemaType('capabilityCategory')
                                                                    .filter(
                                                                        '_type == "capabilityCategory" && category == "material"',
                                                                    )
                                                                    .initialValueTemplates([
                                                                        S.initialValueTemplateItem(
                                                                            CAPABILITY_CATEGORY_MATERIAL_TEMPLATE_ID,
                                                                        ),
                                                                    ]),
                                                            ),
                                                        S.listItem()
                                                            .id('capabilityCategories-finish')
                                                            .title('Finishes')
                                                            .child(
                                                                S.documentList()
                                                                    .apiVersion(
                                                                        sanityStructureApiVersion,
                                                                    )
                                                                    .id('capabilityCategories-finish-list')
                                                                    .title('Finishes')
                                                                    .schemaType('capabilityCategory')
                                                                    .filter(
                                                                        '_type == "capabilityCategory" && category == "finish"',
                                                                    )
                                                                    .initialValueTemplates([
                                                                        S.initialValueTemplateItem(
                                                                            CAPABILITY_CATEGORY_FINISH_TEMPLATE_ID,
                                                                        ),
                                                                    ]),
                                                            ),
                                                    ]),
                                            ),
                                    ]),
                            ),

                    ]),
        }),
        visionTool(),
        assist(),
        presentationTool({
            allowOrigins: ['http://localhost:*'],
            previewUrl: {
                origin: previewOrigin,
                preview: '/',
                previewMode: {
                    enable: '/api/draft-mode/enable',
                    disable: '/api/draft-mode/disable',
                },
            },
            resolve: {
                locations: {
                    homePage: {
                        select: {title: 'title'},
                        resolve: (doc) => ({
                            locations: [
                                {
                                    title: (doc?.title as string) || 'Home',
                                    href: '/',
                                },
                            ],
                        }),
                    },
                    productPage: {
                        select: {title: 'title', slug: 'slug.current'},
                        resolve: (doc) => ({
                            locations: doc?.slug
                                ? [
                                      {
                                          title:
                                              (doc.title as string) ||
                                              (doc.slug as string),
                                          href: `/products/${doc.slug as string}`,
                                      },
                                  ]
                                : [],
                        }),
                    },
                    product: {
                        select: {
                            title: 'title',
                            handle: 'handle.current',
                            pageSlug: 'primaryLandingPage->slug.current',
                            collectionSlug:
                                'primaryCollection->slug.current',
                        },
                        resolve: (doc) => {
                            const handle = doc?.handle as string | undefined;
                            const pageSlug = doc?.pageSlug as
                                | string
                                | undefined;
                            const collectionSlug = doc?.collectionSlug as
                                | string
                                | undefined;
                            if (!handle || !pageSlug || !collectionSlug) {
                                return {locations: []};
                            }
                            return {
                                locations: [
                                    {
                                        title:
                                            (doc?.title as string) || handle,
                                        href: `/products/${pageSlug}/${collectionSlug}/${handle}`,
                                    },
                                ],
                            };
                        },
                    },
                },
            },
        }),
    ],
    schema: {
        types: schemaTypes,
        templates: (prev) => [
            ...prev,
            productForCollectionTemplate,
            productForLandingPageTemplate,
            capabilityCategoryMaterialTemplate,
            capabilityCategoryFinishTemplate,
        ],
    },
});
