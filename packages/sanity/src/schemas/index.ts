import type { SchemaTypeDefinition } from "sanity";
import { author } from "./author";
import { capabilityCategory } from "./capabilityCategory";
import { capabilityLibrary } from "./capabilityLibrary";
import { capabilityPage } from "./capabilityPage";
import { category } from "./category";
import { homePage } from "./homePage";
import { seo } from "./objects/seo";
import { post } from "./post";
import { product } from "./product";
import { productCollection } from "./productCollection";
import { productPage } from "./productPage";
import { siteSettings } from "./siteSettings";
import { staticPage } from "./staticPage";
import { subcategory } from "./subcategory";

export const schemaTypes: SchemaTypeDefinition[] = [
  seo,
  capabilityCategory,
  capabilityLibrary,
  productCollection,
  capabilityPage,
  productPage,
  staticPage,
  homePage,
  product,
  post,
  author,
  siteSettings,
  category,
  subcategory,
];

export {
  author,
  capabilityCategory,
  capabilityLibrary,
  capabilityPage,
  category,
  homePage,
  post,
  product,
  productCollection,
  productPage,
  seo,
  siteSettings,
  staticPage,
  subcategory,
};
