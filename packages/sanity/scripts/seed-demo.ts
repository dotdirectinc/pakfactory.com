/**
 * Idempotent demo seed: Rigid product page, two collections, two products.
 *
 * Env (repo root .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET or SANITY_STUDIO_DATASET
 *   SANITY_API_WRITE_TOKEN — Editor token with write access
 *
 * Run from repo root: npm run seed:demo
 */

import { createClient, type SanityClient } from "@sanity/client";
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "../../../.env.local") });
loadEnv({ path: join(__dirname, "../../../.env") });

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_STUDIO_PROJECT_ID ||
  "";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_STUDIO_DATASET ||
  "production";
const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";
const token = process.env.SANITY_API_WRITE_TOKEN || "";

const IDS = {
  productPageRigid: "seed.productPage.rigid",
  collectionMagnetic: "seed.productCollection.magnetic-closure-boxes",
  collectionDoubleDoor: "seed.productCollection.double-door-rigid-boxes",
  productCandy: "seed.product.candy-gift-boxes",
  productBoardGame: "seed.product.board-game-boxes",
} as const;

function block(text: string, key: string) {
  return {
    _type: "block" as const,
    _key: key,
    style: "normal" as const,
    markDefs: [] as const,
    children: [
      {
        _type: "span" as const,
        _key: `${key}-s`,
        text,
        marks: [] as const,
      },
    ],
  };
}

function slug(current: string) {
  return { _type: "slug" as const, current };
}

function ref(id: string, key: string) {
  return { _type: "reference" as const, _ref: id, _key: key };
}

async function seed() {
  if (!projectId) {
    console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID");
    process.exit(1);
  }
  if (!token) {
    console.error("Missing SANITY_API_WRITE_TOKEN (Editor token with write access)");
    process.exit(1);
  }

  const client: SanityClient = createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
  });

  const tx = client.transaction();

  tx.createOrReplace({
    _id: IDS.productPageRigid,
    _type: "productPage",
    title: "Rigid",
    slug: slug("rigid"),
    heroHeadline: "Rigid packaging solutions",
    solutionType: "standard",
    body: [
      block(
        "Explore rigid boxes for retail, gifts, and premium presentation.",
        "ppBody1",
      ),
    ],
    standardBody: [
      block("Standard rigid programs with predictable specs and lead times.", "ppStd1"),
    ],
    relatedCollections: [
      {
        _type: "relatedCollectionItem" as const,
        _key: "relCol1",
        collection: { _type: "reference" as const, _ref: IDS.collectionMagnetic },
      },
      {
        _type: "relatedCollectionItem" as const,
        _key: "relCol2",
        collection: { _type: "reference" as const, _ref: IDS.collectionDoubleDoor },
      },
    ],
    includeCollectionsFromProducts: true,
  });

  tx.createOrReplace({
    _id: IDS.collectionMagnetic,
    _type: "productCollection",
    title: "Magnetic Closure Boxes",
    slug: slug("magnetic-closure-boxes"),
  });

  tx.createOrReplace({
    _id: IDS.collectionDoubleDoor,
    _type: "productCollection",
    title: "Double Door Rigid Boxes",
    slug: slug("double-door-rigid-boxes"),
  });

  tx.createOrReplace({
    _id: IDS.productCandy,
    _type: "product",
    title: "Custom Rigid Two Piece Lift-Off Lid Candy Gift Boxes",
    handle: slug("custom-rigid-two-piece-lift-off-lid-candy-gift-boxes"),
    primaryLandingPage: ref(IDS.productPageRigid, "plp"),
    primaryCollection: ref(IDS.collectionMagnetic, "pc"),
    description: [
      block(
        "Two-piece rigid box with lift-off lid — ideal for candy and gift sets.",
        "descC1",
      ),
    ],
    specs: {
      dimensions: "Custom",
      moq: "500",
      leadTime: "Contact sales",
      materialOptions: "Paperboard, specialty wraps",
    },
  });

  tx.createOrReplace({
    _id: IDS.productBoardGame,
    _type: "product",
    title: "Custom Board Game Lid-Off Boxes",
    handle: slug("custom-board-game-lift-off-boxes"),
    primaryLandingPage: ref(IDS.productPageRigid, "plp2"),
    primaryCollection: ref(IDS.collectionDoubleDoor, "pc2"),
    description: [
      block(
        "Lift-off lid rigid packaging sized for board games and kit collections.",
        "descB1",
      ),
    ],
    specs: {
      dimensions: "Custom",
      moq: "300",
      leadTime: "Contact sales",
      materialOptions: "Paperboard, linen wraps",
    },
  });

  await tx.commit({ autoGenerateArrayKeys: true });
  console.log("Seed committed. Document IDs:", IDS);
  console.log(
    "Example PDP URLs:\n" +
      "  /products/rigid/magnetic-closure-boxes/custom-rigid-two-piece-lift-off-lid-candy-gift-boxes\n" +
      "  /products/rigid/double-door-rigid-boxes/custom-board-game-lift-off-boxes",
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
