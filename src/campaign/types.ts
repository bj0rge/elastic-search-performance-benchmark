import type { BenchmarkConfig } from "../types";

export type VariableType =
  | "numberOfBatches"
  | "documentsPerBatch"
  | "descriptionLength"
  | "indexType"
  | "numberOfUpdateBatches"
  | "documentsPerUpdateBatch"
  | "fuzziness";

export type VariationParams = {
  variable: VariableType;
  min: number;
  max: number;
  increment: number;
  values?: string[];
};

export type CampaignConfig = {
  baseConfig: BenchmarkConfig;
  variations: VariationParams;
  repetitions: number;
};

export type BenchmarkRunner = (config: BenchmarkConfig) => Promise<any>;

export type CampaignResult = {
  campaignId: string;
  timestamp: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  executionTimeMs: number;
  configurations: BenchmarkConfig[];
  results: string[];
};
