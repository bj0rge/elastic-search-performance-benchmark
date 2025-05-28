import type { BenchmarkRunner } from "./types";
import type { BenchmarkConfig } from "../types/benchmark";
import { runBenchmark } from "../benchmark/runner";
import { saveBenchmarkResults } from "../persistence";

export const createBenchmarkRunner = (options: {
  verbose?: boolean;
  cleanup?: {
    deleteIndexBefore?: boolean;
    deleteIndexAfter?: boolean;
  };
}): BenchmarkRunner => {
  return async (config: BenchmarkConfig) => {
    console.log(`🔄 Running benchmark: ${config.indexName}`);

    const result = await runBenchmark(config, {
      verbose: options.verbose ?? false,
      cleanup: options.cleanup ?? {
        deleteIndexBefore: true,
        deleteIndexAfter: true,
      },
    });

    const rawBenchmarkData = {
      config: result.config,
      indexingData: result.indexingData,
      updateData: result.updateData,
      searchData: result.searchData,
      totalTestDurationMs: result.totalTestDurationMs,
    };

    return await saveBenchmarkResults(rawBenchmarkData);
  };
};

export const createMockRunner = (): BenchmarkRunner => {
  return async (config: BenchmarkConfig) => {
    console.log(`🧪 Mock run with config:`);
    console.log(`\t- Index: ${config.indexName}`);
    console.log(`\t- Type: ${config.indexType}`);
    console.log(`\t- Batches: ${config.numberOfBatches}`);
    console.log(`\t- Docs per batch: ${config.documentsPerBatch}`);
    console.log(`\t- Description length: ${config.descriptionLength}`);

    await new Promise((resolve) => setTimeout(resolve, 100));
    return `mock_result_${config.indexName}_${Date.now()}.json`;
  };
};
