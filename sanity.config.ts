'use client'

import {visionTool} from '@sanity/vision'
import {media} from 'sanity-plugin-media'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool, defineDocuments, defineLocations} from 'sanity/presentation'

import {apiVersion, dataset, projectId} from './src/sanity/env'
import {schema} from './src/sanity/schemaTypes'
import {SINGLETON_TYPES, structure} from './src/sanity/structure'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema,
  document: {
    // Singletons (see structure.ts): not offered by the global create
    // button, and never duplicated, deleted or unpublished from their pane.
    newDocumentOptions: (prev, {creationContext}) =>
      creationContext.type === 'global' ? prev.filter((t) => !SINGLETON_TYPES.includes(t.templateId)) : prev,
    actions: (prev, {schemaType}) =>
      SINGLETON_TYPES.includes(schemaType)
        ? prev.filter(({action}) => !['duplicate', 'delete', 'unpublish'].includes(action ?? ''))
        : prev,
  },
  plugins: [
    structureTool({structure}),
    presentationTool({
      previewUrl: {
        previewMode: {
          enable: '/api/draft-mode/enable',
          disable: '/api/draft-mode/disable',
        },
      },
      resolve: {
        mainDocuments: defineDocuments([
          {
            route: '/project/:slug',
            filter: `_type == "project" && slug.current == $slug`,
          },
          {
            route: '/journal/:slug',
            filter: `_type == "journalPost" && slug.current == $slug`,
          },
          {
            route: '/about',
            filter: `_type == "about"`,
          },
        ]),
        locations: {
          project: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: [
                ...(doc?.slug
                  ? [{title: doc.title || 'Untitled', href: `/project/${doc.slug}`}]
                  : []),
                {title: 'Homepage', href: '/'},
              ],
            }),
          }),
          journalPost: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: [
                ...(doc?.slug
                  ? [{title: doc.title || 'Untitled', href: `/journal/${doc.slug}`}]
                  : []),
                {title: 'Journal', href: '/journal'},
              ],
            }),
          }),
          about: defineLocations({
            select: {title: 'heading'},
            resolve: (doc) => ({
              locations: [
                {title: doc?.title || 'About', href: '/about'},
              ],
            }),
          }),
        },
      },
    }),
    visionTool({defaultApiVersion: apiVersion}),
    media(),
  ],
})
