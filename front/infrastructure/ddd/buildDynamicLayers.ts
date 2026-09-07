import { globSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

type ComponentDir = {
  path: string;
  prefix: string;
  pathPrefix: boolean;
  extensions: string[];
};

export type DynamicLayers = {
  layerList: string[];
  layerConfigTsGlobList: string[];
  cssList: string[];
  typesDirList: string[];
  componentsList: ComponentDir[];
  translationFileList: (locale: string) => string[];
};

const LAYER_CONFIG_GLOBS = ['domain/**/nuxt.config.ts', 'infrastructure/**/nuxt.config.ts'];

// Every slice is a real Nuxt layer discovered by its own nuxt.config.ts —
// derive the root config's wiring from the filesystem, no manual edit needed.
export const buildDynamicLayers = (): DynamicLayers => {
  const layers = discoverLayers();
  return {
    layerList: layers,
    layerConfigTsGlobList: LAYER_CONFIG_GLOBS.map(prependParentDir),
    cssList: discoverLayerStyles(),
    typesDirList: discoverAutoImportDirs(),
    componentsList: layers.flatMap((layerPath) => buildComponentDirs(layerPath, layers)),
    translationFileList: discoverLayerTranslations,
  };
};

const discoverLayers = (): string[] => globSync(LAYER_CONFIG_GLOBS).map(dirname);

const prependParentDir = (glob: string): string => `../${glob}`;

const discoverLayerStyles = (): string[] =>
  globSync(['domain/**/style/*.css', 'infrastructure/**/style/*.css']).map(buildRootAlias);

const buildRootAlias = (file: string): string => `~~/${file.replaceAll(sep, '/')}`;

// Auto-imported by name rather than path, so a `types/` or `composables/`
// folder is picked up at any depth inside a layer — a capability subfolder
// like `plant/analysis/composables` needs no config of its own.
const discoverAutoImportDirs = (): string[] => [
  ...globSync(['domain/**/types', 'infrastructure/**/types']),
  ...globSync(['domain/**/composables', 'infrastructure/**/composables']),
];

const discoverLayerTranslations = (locale: string): string[] =>
  globSync([
    `domain/**/translation/${locale}.json`,
    `infrastructure/**/translation/${locale}.json`,
  ]).map((file) => resolve(file));

// A layer's components can sit directly under `components/` or be grouped by
// capability (`plant/analysis/components`, `plant/care/components`…) — every
// `components` folder found anywhere in the layer shares the layer's OWN
// prefix (pathPrefix:false already ignores intermediate segments), so
// grouping components by capability never renames a single tag. A NESTED
// layer (its own nuxt.config.ts, e.g. `ui/layers/animation`) owns its
// `components` subtree and registers separately — excluded here so it isn't
// also swept into the parent's glob under the parent's (wrong) prefix.
const buildComponentDirs = (layerPath: string, allLayers: string[]): ComponentDir[] =>
  globSync(`${layerPath}/**/components`)
    .filter((path) => !isOwnedByNestedLayer(path, layerPath, allLayers))
    .map((path) => ({
      path,
      prefix: deriveLayerPrefix(layerPath),
      pathPrefix: false,
      extensions: ['.vue'],
    }));

const isOwnedByNestedLayer = (
  componentsPath: string,
  layerPath: string,
  allLayers: string[],
): boolean =>
  allLayers.some(
    (candidate) =>
      candidate !== layerPath &&
      candidate.startsWith(`${layerPath}${sep}`) &&
      componentsPath.startsWith(`${candidate}${sep}`),
  );

// A layer's auto-import prefix is its path in PascalCase, minus the structural
// segments: infrastructure/ui/layers/animation -> UiAnimation, domain/home -> Home.
const deriveLayerPrefix = (layerPath: string): string =>
  relative('.', layerPath).split(sep).filter(isNameSegment).map(capitalise).join('');

const isNameSegment = (segment: string): boolean =>
  !['domain', 'infrastructure', 'layers'].includes(segment);

const capitalise = (segment: string): string => segment[0]!.toUpperCase() + segment.slice(1);
