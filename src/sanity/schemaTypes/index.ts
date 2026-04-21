import { type SchemaTypeDefinition } from "sanity";
import { project } from "./project";
import { journalPost } from "./journalPost";
import { journalPage } from "./journalPage";
import { about } from "./about";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [project, journalPost, journalPage, about],
};
