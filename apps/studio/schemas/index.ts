import { capabilityCategory } from './capabilityCategory'
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
import { blogTag } from './blogTag'
import { bodyImage } from './bodyImage'
import { contentWidget } from './contentWidget'
import { widgetEmbed } from './widgetEmbed'
import { solution } from './solution'
import { aboutPage, contactPage, privacyPolicy, termsOfService } from './staticPages'
import { expertiseStage } from './expertiseStage'
import { caseStudy } from './caseStudy'
import { glossaryTerm, guide, helpArticle } from './resources'
import { blogSettings } from './blogSettings'
import { blogPage } from './blogPage'
import { solutionsSettings } from './solutionsSettings'
import { page } from './page'
import { post } from './post'
import { redirect } from './redirect'
import { settings } from './settings'
import { pageBuilderSections, pageBuilder, pageBuilderHome, pageBuilderLanding } from './sections'

export const schemaTypes = [
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
  blogTag,
  bodyImage,
  contentWidget,
  widgetEmbed,
  page,
  post,
  redirect,

  // Page builder
  ...pageBuilderSections,
  pageBuilder,
  pageBuilderHome,
  pageBuilderLanding,

  // Singletons
  settings,
  blogSettings,
  blogPage,
  aboutPage,
  contactPage,
  privacyPolicy,
  termsOfService,
]
