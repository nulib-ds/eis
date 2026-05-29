/**
 * Replace the examples with your own components or add new ones. You
 * may also import components from dependencies and re-export them here.
 */


// Map SSR-safe components to be rendered at build time and used in MDX files
export const components = {
  Example: './Example.tsx',
  MetadataField: './MetadataField.tsx',
};

// Map browser-only components to their source files; the builder bundles
// them separately and hydrates placeholders at runtime.
export const clientComponents = {
  ExampleClient: './Example.client.tsx',
  Glossary: "./Glossary.client.tsx",
  StoryMapJS: './StoryMapJS.client.tsx',
  ExhibitionModules: './ExhibitionModules.tsx',
  SigmaExample: './SigmaExample.Client.jsx',
  EISAnnotations: './EISAnnotations.client.tsx',
  EISFilterBar: './EISFilterBar.client.tsx',
  EISRelatedWorks: './EISRelatedWorks.client.tsx',
  EISFeaturedWorks: './EISFeaturedWorks.client.tsx',
  EISRelatedThemes: './EISRelatedThemes.client.tsx',
  LightboxImage: './LightboxImage.client.tsx',
  ScrollExplore: './ScrollExplore.client.tsx',
  StickyLightbox: './Stickylightbox.client.tsx',
  EISMap: './EISMap.client.jsx',
};

