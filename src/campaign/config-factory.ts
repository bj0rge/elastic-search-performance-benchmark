import type { BenchmarkConfig, IndexType } from "../types/benchmark";
import type { CampaignConfig, VariableType } from "./types";

export const createBaseConfig = (options: {
  indexName: string;
  indexType?: IndexType;
  batches?: number;
  docsPerBatch?: number;
  descLength?: number;
  verbose?: boolean;
}): BenchmarkConfig => {
  return {
    indexName: options.indexName,
    indexType: options.indexType || "standard",
    numberOfBatches: options.batches || 10,
    documentsPerBatch: options.docsPerBatch || 100,
    descriptionLength: options.descLength || 1,
    updateConfig: {
      numberOfUpdateBatches: Math.max(
        1,
        Math.floor((options.batches || 10) / 2)
      ),
      documentsPerUpdateBatch: Math.max(
        1,
        Math.floor((options.docsPerBatch || 100) / 2)
      ),
    },
    searchQueries: {
      fullTextSearch: {
        fields: ["name", "description"],
        terms: ["product", "electronic", "device", "news", "article"],
      },
      fuzzySearch: {
        field: "name",
        terms: ["produc", "electro", "devic", "nws", "articl"],
        fuzziness: "AUTO",
      },
    },
    verbose: options.verbose || false,
  };
};

export const createCampaignConfig = (
  baseConfig: BenchmarkConfig,
  variable: VariableType,
  min: number,
  max: number,
  increment: number,
  repetitions: number,
  values?: string[]
): CampaignConfig => {
  return {
    baseConfig,
    variations: {
      variable,
      min,
      max,
      increment,
      values,
    },
    repetitions,
  };
};
