export type Locale = "en" | "es";
export interface Localized {
  en: string;
  es: string;
}
export type TeachingModel = "general" | "orchid";
export type ViewMode = "specimen" | "anatomy" | "lifecycle";
export interface Source {
  id: string;
  label: string;
  citation: string;
  url: string;
}
export interface CatalogAsset {
  path: string;
  sha256: string;
  bytes: number;
  triangles: number;
}
export interface Specimen {
  id: string;
  scientificName: string;
  commonName: Localized;
  description: Localized;
  facts: { label: Localized; value: Localized }[];
  sourceIds: string[];
  preview: CatalogAsset;
  detail: CatalogAsset;
  credit: string;
}
export interface Structure {
  id: string;
  label: Localized;
  group: string;
  models: TeachingModel[];
  summary: Localized;
  detail: Localized;
  sourceIds: string[];
}
export interface JourneyView {
  mode: ViewMode;
  model?: TeachingModel;
  specimen?: string;
  compare?: string;
  selected?: string;
  explode?: number;
  cut?: number;
  cutEnabled?: boolean;
  stage?: number;
}
export interface JourneyStep {
  title: Localized;
  body: Localized;
  view: JourneyView;
}
export interface Journey {
  id: string;
  title: Localized;
  question: Localized;
  summary: Localized;
  sourceIds: string[];
  steps: JourneyStep[];
}
export interface Catalog {
  schemaVersion: 1;
  sources: Source[];
  specimens: Specimen[];
  structures: Structure[];
  journeys: Journey[];
}
