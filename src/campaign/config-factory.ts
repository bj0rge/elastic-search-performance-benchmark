import type { BenchmarkConfig, IndexType } from "../types/benchmark";
import type { CampaignConfig, VariableType } from "./types";
import {
  generateProductStructure,
  validateProductStructureConfig,
} from "../generator/product-structure";
import { getSearchableFields } from "../config/dynamic-index-configs";

export const createBaseConfig = (options: {
  indexName: string;
  indexType?: IndexType;
  batches?: number;
  docsPerBatch?: number;
  additionalFields?: number;
  totalWords?: number;
  descWordLength?: number;
  verbose?: boolean;
  chartName?: string;
}): BenchmarkConfig => {
  let structureConfig;

  if (options.descWordLength !== undefined) {
    structureConfig = {
      additionalFields: 1,
      totalWords: options.descWordLength,
    };
  } else {
    structureConfig = {
      additionalFields: options.additionalFields ?? 1,
      totalWords: options.totalWords ?? 10,
    };
  }

  validateProductStructureConfig(structureConfig);
  const productStructure = generateProductStructure(structureConfig);

  const searchableFields = getSearchableFields(productStructure);

  if (searchableFields.length === 0) {
    throw new Error(
      "No searchable fields found. At least one field with words is required."
    );
  }

  return {
    indexName: options.indexName,
    indexType: options.indexType || "standard",
    chartName: options.chartName,
    productStructure,
    numberOfBatches: options.batches || 10,
    documentsPerBatch: options.docsPerBatch || 100,
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
        fields: searchableFields,
        terms: ["product", "electronic", "device", "news", "article"],
      },
      fuzzySearch: {
        field: searchableFields[0],
        terms: ["produc", "electro", "devic", "nws", "articl"],
        fuzziness: "AUTO",
      },
    },
    verbose: options.verbose || false,
  };
};

export const generateChartName = (variable: VariableType): string => {
  const chartNames: Record<VariableType, string> = {
    numberOfBatches: "Batch Count Scaling",
    documentsPerBatch: "Batch Size Scaling",
    descriptionWordLength: "Content Length Scaling (in words)",
    additionalFields: "Field Count Impact",
    totalWords: "Content Length Scaling (words)",
    indexType: "Index Type Comparison",
    numberOfUpdateBatches: "Update Batch Scaling",
    documentsPerUpdateBatch: "Update Batch Size Impact",
    fuzziness: "Fuzziness Optimization",
  };

  return chartNames[variable] || `${variable} Analysis`;
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
  if (!baseConfig.chartName) {
    baseConfig.chartName = generateChartName(variable);
  }

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
