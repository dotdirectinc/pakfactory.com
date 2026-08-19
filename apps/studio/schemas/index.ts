import { customizationCategory } from './customizationCategory'
import { socialLink } from '../lib/social-link-schema'
import { customizationType } from './customizationType'
import { customizationOption } from './customizationOption'
import { optionGroup } from './optionGroup'
import { property } from './property'
import { propertyValue } from './propertyValue'
import { productLine } from './productLine'
import { productStyle } from './productStyle'
import { bundle } from './bundle'
import { product } from './product'
import { author } from './author'
import { blogCategory } from './blogCategory'
import { blogTopicGroup } from './blogTopicGroup'
import { blogTag } from './blogTag'
import { bodyImage } from './bodyImage'
import { inlineBlocks, caseStudyInlineBlocks } from './inline'
import { contentWidget } from './contentWidget'
import { widgetEmbed } from './widgetEmbed'
import { solution } from './solution'
import { aboutPage, contactPage, privacyPolicy, termsOfService } from './staticPages'
import { expertiseStage } from './expertiseStage'
import { client } from './client'
import { caseStudy } from './caseStudy'
import { caseStudiesPage } from './caseStudiesPage'
import { faq } from './faq'
import { helpCategory } from './helpCategory'
import { guide } from './guide'
import { glossaryTerm } from './glossaryTerm'
import { dieline } from './dieline'
import { blogNavigation } from './blogNavigation'
import {
  postSettings,
  categorySettings,
  topicSettings,
  authorSettings,
  pageSettings,
} from './blogTypeSettings'
import { blogPage } from './blogPage'
import { solutionsSettings } from './solutionsSettings'
import { page } from './page'
import { post } from './post'
import { videoPost } from './videoPost'
import { redirect } from './redirect'
import { redirectGroup } from './redirectGroup'
import { settings } from './settings'
import {
  pageBuilderBlocks,
  pageBuilderHome,
  pageBuilderLanding,
  pageBuilderFooter,
} from './blocks'

export const schemaTypes = [
  // Shared objects
  socialLink,

  // Customization layer
  customizationCategory,
  customizationType,
  customizationOption,
  optionGroup,

  // Attribute layer
  property,
  propertyValue,

  // Product taxonomy
  productLine,
  productStyle,

  // Product layer
  product,
  bundle,

  // Solutions & Core Entities
  solution,
  expertiseStage,
  client,
  caseStudy,
  caseStudiesPage,
  solutionsSettings,

  // Resources
  faq,
  helpCategory,
  guide,
  dieline,
  glossaryTerm,

  // Editorial
  author,
  blogCategory,
  blogTopicGroup,
  blogTag,
  bodyImage,
  ...inlineBlocks,
  ...caseStudyInlineBlocks,
  contentWidget,
  widgetEmbed,
  page,
  post,
  videoPost,
  redirect,
  redirectGroup,

  // Page builder
  ...pageBuilderBlocks,
  pageBuilderHome,
  pageBuilderLanding,
  pageBuilderFooter,

  // Singletons
  settings,
  blogNavigation,
  postSettings,
  categorySettings,
  topicSettings,
  authorSettings,
  pageSettings,
  blogPage,
  aboutPage,
  contactPage,
  privacyPolicy,
  termsOfService,
]
