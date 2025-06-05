import type { BenchmarkRunner } from "./types";
import type { BenchmarkConfig } from "../types/benchmark";
import { runBenchmark } from "../benchmark/runner";
import { saveBenchmarkResults } from "../persistence";

type RunnerOptions = {
  verbose?: boolean;
  cleanup?: {
    deleteIndexBefore?: boolean;
    deleteIndexAfter?: boolean;
  };
  phases?: {
    indexing?: boolean;
    updates?: boolean;
    search?: boolean;
  };
};

export const createBenchmarkRunner = (
  options: RunnerOptions = {}
): BenchmarkRunner => {
  return async (config: BenchmarkConfig) => {
    const phases = options.phases || {
      indexing: true,
      updates: true,
      search: true,
    };

    const enabledPhases = Object.entries(phases)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    console.log(`🔄 Running benchmark: ${config.indexName}`);
    console.log(`📊 Phases: ${enabledPhases.join(", ")}`);

    const result = await runBenchmark(config, {
      verbose: options.verbose ?? false,
      cleanup: options.cleanup ?? {
        deleteIndexBefore: true,
        deleteIndexAfter: true,
      },
      phases: phases,
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

export const createMockRunner = (
  options: RunnerOptions = {}
): BenchmarkRunner => {
  return async (config: BenchmarkConfig) => {
    const phases = options.phases || {
      indexing: true,
      updates: true,
      search: true,
    };

    console.log(`🧪 Mock run with config:`);
    console.log(`\t- Index: ${config.indexName}`);
    console.log(`\t- Type: ${config.indexType}`);
    console.log(`\t- Batches: ${config.numberOfBatches}`);
    console.log(`\t- Docs per batch: ${config.documentsPerBatch}`);
    console.log(
      `\t- Phases: ${Object.entries(phases)
        .filter(([_, enabled]) => enabled)
        .map(([name]) => name)
        .join(", ")}`
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    return `mock_result_${config.indexName}_${Date.now()}.json`;
  };
};
