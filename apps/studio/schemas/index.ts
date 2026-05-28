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
import { page } from './page'
import { post } from './post'
import { redirect } from './redirect'
import { settings } from './settings'

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

  // Singleton
  settings,
]
