import type {StructureResolver} from 'sanity/structure'

/**
 * The about page and the journal page exist once. Each opens by the id of
 * the live document (a random UUID from when it was created, not a fixed
 * one), so the Studio never offers a second About or Journal page; the
 * create menu and the document actions are trimmed in sanity.config.ts.
 */
export const SINGLETONS = [
  {type: 'about', title: 'About', id: '2991a3b9-6f30-444b-af7d-98796ecc3a1d'},
  {type: 'journalPage', title: 'Journal page', id: 'a1d9513c-8152-46da-a64d-38b2e55cbbe8'},
] as const

export const SINGLETON_TYPES: readonly string[] = SINGLETONS.map((s) => s.type)

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      ...S.documentTypeListItems().filter((item) => !SINGLETON_TYPES.includes(item.getId() ?? '')),
      S.divider(),
      ...SINGLETONS.map((s) =>
        // The item's id is the document's: an edit intent (global search, a
        // reference's "open") resolves to the pane by it.
        S.listItem().title(s.title).id(s.id).schemaType(s.type).child(S.document().schemaType(s.type).documentId(s.id)),
      ),
    ])
