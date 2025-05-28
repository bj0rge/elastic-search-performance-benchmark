import type { BenchmarkConfig, IndexType } from "../types/benchmark";
import type { CampaignConfig, VariableType } from "./types";

export const createBaseConfig = (options: {
  indexName: string;
  indexType?: IndexType;
  batches?: number;
  docsPerBatch?: number;
  descLength?: number;
  verbose?: boolean;
  chartName?: string;
}): BenchmarkConfig => {
  return {
    indexName: options.indexName,
    indexType: options.indexType || "standard",
    chartName: options.chartName,
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

export const generateChartName = (variable: VariableType): string => {
  const chartNames: Record<VariableType, string> = {
    numberOfBatches: "Batch Count Scaling",
    documentsPerBatch: "Batch Size Scaling",
    descriptionLength: "Content Length Scaling",
    indexType: "Index Type Comparison",
    numberOfUpdateBatches: "Update Batch Scaling",
    documentsPerUpdateBatch: "Update Batch Size Impact",
    fuzziness: "Fuzziness Optimization",
  };

  return chartNames[variable];
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
