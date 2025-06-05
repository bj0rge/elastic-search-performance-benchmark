import fs from "fs-extra";
import path from "path";
import {
  BenchmarkResult,
  BenchmarkConfig,
  IndexingMetrics,
  UpdateMetrics,
  SearchMetrics,
} from "../types";
import { calculateTotalTimeFromBatches } from "./utils";

type RawIndexingData = {
  totalDocuments: number;
  totalBatches: number;
  batchResults: {
    batchNumber: number;
    documentsInBatch: number;
    indexingTimeMs: number;
    errors: boolean;
    errorCount?: number;
  }[];
  refreshTimeMs: number;
};

type RawUpdateData = {
  totalDocumentsUpdated: number;
  totalUpdateBatches: number;
  updateBatchResults: {
    batchNumber: number;
    documentsInBatch: number;
    updateTimeMs: number;
    errors: boolean;
    errorCount?: number;
  }[];
  reindexingTimeMs: number;
};

type RawSearchData = {
  fullTextSearchResults: {
    term: string;
    searchTimeMs: number;
    resultsCount: number;
    totalHits: number;
  }[];
  fuzzySearchResults: {
    term: string;
    fuzziness: string | number;
    searchTimeMs: number;
    resultsCount: number;
    totalHits: number;
  }[];
};

export type RawBenchmarkData = {
  config: BenchmarkConfig;
  indexingData: RawIndexingData;
  updateData: RawUpdateData;
  searchData: RawSearchData;
  totalTestDurationMs: number;
};

export const RESULTS_DIR = path.resolve(__dirname, "../../data/results");

fs.ensureDirSync(RESULTS_DIR);

const generateFileName = (config: BenchmarkConfig): string => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const totalDocs = config.numberOfBatches * config.documentsPerBatch;

  return `benchmark_${timestamp}_${config.indexType}_${totalDocs}-docs.json`;
};

const calculateIndexingMetrics = (data: RawIndexingData): IndexingMetrics => {
  const totalIndexingTimeMs = calculateTotalTimeFromBatches(
    data.batchResults,
    "indexingTimeMs"
  );

  return {
    totalDocuments: data.totalDocuments,
    totalBatches: data.totalBatches,
    batchResults: data.batchResults,
    refreshTimeMs: data.refreshTimeMs,
    totalIndexingTimeMs,
    averageTimePerDocumentMs: parseFloat(
      (totalIndexingTimeMs / data.totalDocuments).toFixed(2)
    ),
    averageTimePerBatchMs: parseFloat(
      (totalIndexingTimeMs / data.totalBatches).toFixed(2)
    ),
  };
};

const calculateUpdateMetrics = (data: RawUpdateData): UpdateMetrics => {
  const totalUpdateTimeMs = calculateTotalTimeFromBatches(
    data.updateBatchResults,
    "updateTimeMs"
  );

  return {
    ...data,
    totalUpdateTimeMs,
    averageTimePerUpdateMs: parseFloat(
      (totalUpdateTimeMs / data.totalDocumentsUpdated).toFixed(2)
    ),
    averageTimePerUpdateBatchMs: parseFloat(
      (totalUpdateTimeMs / data.totalUpdateBatches).toFixed(2)
    ),
  };
};

const calculateSearchMetrics = (data: RawSearchData): SearchMetrics => {
  const avgFullTextTime =
    data.fullTextSearchResults.length > 0
      ? data.fullTextSearchResults.reduce(
          (sum, result) => sum + result.searchTimeMs,
          0
        ) / data.fullTextSearchResults.length
      : 0;

  const avgFuzzyTime =
    data.fuzzySearchResults.length > 0
      ? data.fuzzySearchResults.reduce(
          (sum, result) => sum + result.searchTimeMs,
          0
        ) / data.fuzzySearchResults.length
      : 0;

  return {
    ...data,
    averageFullTextSearchTimeMs: parseFloat(avgFullTextTime.toFixed(2)),
    averageFuzzySearchTimeMs: parseFloat(avgFuzzyTime.toFixed(2)),
  };
};

export const saveBenchmarkResults = async (
  rawData: RawBenchmarkData
): Promise<string> => {
  const indexingMetrics = calculateIndexingMetrics(rawData.indexingData);
  const updateMetrics = calculateUpdateMetrics(rawData.updateData);
  const searchMetrics = calculateSearchMetrics(rawData.searchData);

  const result: BenchmarkResult = {
    timestamp: new Date().toISOString(),
    testId: generateFileName(rawData.config).replace(".json", ""),
    config: rawData.config,
    indexingMetrics,
    updateMetrics,
    searchMetrics,
    totalTestDurationMs: rawData.totalTestDurationMs,
  };

  const fileName = generateFileName(rawData.config);
  const filePath = path.join(RESULTS_DIR, fileName);

  await fs.writeJson(filePath, result, { spaces: 2 });

  console.log(`✅ Benchmark results saved to: ${filePath}`);
  return filePath;
};
