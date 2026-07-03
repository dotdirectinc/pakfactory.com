import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { createClient } from "next-sanity";
import {
  getSanityApiVersion,
  getSanityDataset,
  getSanityProjectId,
} from "@/lib/sanity/env";

const token = process.env["SANITY_API_READ_TOKEN"];

export const { GET } = defineEnableDraftMode({
  client: createClient({
    projectId: getSanityProjectId(),
    dataset: getSanityDataset(),
    apiVersion: getSanityApiVersion(),
    useCdn: false,
    token,
  }).withConfig({ token }),
});
