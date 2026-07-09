import { capabilityCategory } from './capabilityCategory'
import { socialLink } from '../lib/social-link-schema'
import { capabilityType } from './capabilityType'
import { capability } from './capability'
import { attributeGroup } from './attributeGroup'
import { attribute } from './attribute'
import { productCategory } from './productCategory'
import { productStyleCategory } from './productStyleCategory'
import { industry } from './industry'
import { industryCategory } from './industryCategory'
import { useCase } from './useCase'
import { product } from './product'
import { author } from './author'
import { blogCategory } from './blogCategory'
import { blogTopicGroup } from './blogTopicGroup'
import { blogTag } from './blogTag'
import { bodyImage } from './bodyImage'
import { inlineBlocks } from './inline'
import { contentWidget } from './contentWidget'
import { widgetEmbed } from './widgetEmbed'
import { solution } from './solution'
import { aboutPage, contactPage, privacyPolicy, termsOfService } from './staticPages'
import { expertiseStage } from './expertiseStage'
import { caseStudy } from './caseStudy'
import { glossaryTerm, guide, helpArticle } from './resources'
import { blogNavigation } from './blogNavigation'
import { blogSettings } from './blogSettings'
import { blogPage } from './blogPage'
import { solutionsSettings } from './solutionsSettings'
import { page } from './page'
import { post } from './post'
import { redirect } from './redirect'
import { settings } from './settings'
import {
  pageBuilderBlocks,
  pageBuilder,
  pageBuilderHome,
  pageBuilderLanding,
} from './blocks'

export const schemaTypes = [
  // Shared objects
  socialLink,

  // Capability layer
  capabilityCategory,
  capabilityType,
  capability,

  // Attribute layer
  attributeGroup,
  attribute,

  // Product taxonomy
  productCategory,
  productStyleCategory,
  industry,
  industryCategory,
  useCase,

  // Product layer
  product,

  // Solutions & Core Entities
  solution,
  expertiseStage,
  caseStudy,
  solutionsSettings,

  // Resources
  glossaryTerm,
  guide,
  helpArticle,

  // Editorial
  author,
  blogCategory,
  blogTopicGroup,
  blogTag,
  bodyImage,
  ...inlineBlocks,
  contentWidget,
  widgetEmbed,
  page,
  post,
  videoPost,
  redirect,

  // Page builder
  ...pageBuilderBlocks,
  pageBuilder,
  pageBuilderHome,
  pageBuilderLanding,

  // Singletons
  settings,
  blogNavigation,
  blogSettings,
  blogPage,
  aboutPage,
  contactPage,
  privacyPolicy,
  termsOfService,
]
