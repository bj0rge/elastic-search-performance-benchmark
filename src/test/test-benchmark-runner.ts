import { runBenchmark } from "../benchmark/runner";
import { saveBenchmarkResults } from "../persistence";
import { BenchmarkConfig } from "../types";

const createTestConfig = (): BenchmarkConfig => ({
  indexName: "benchmark-runner-test",
  indexType: "standard",

  numberOfBatches: 3,
  documentsPerBatch: 10,
  descriptionLength: 2,

  updateConfig: {
    numberOfUpdateBatches: 2,
    documentsPerUpdateBatch: 5,
  },

  searchQueries: {
    fullTextSearch: {
      fields: ["name", "description"],
      terms: ["product", "test", "electronic"],
    },
    fuzzySearch: {
      field: "name",
      terms: ["produc", "electro", "devic"],
      fuzziness: "AUTO",
    },
  },
  verbose: true,
});

const testBenchmarkRunner = async () => {
  console.log("🧪 Testing Complete Benchmark Runner...\n");

  try {
    const config = createTestConfig();

    const result = await runBenchmark(config, {
      verbose: true,
      cleanup: {
        deleteIndexBefore: true,
        deleteIndexAfter: true,
      },
    });

    console.log("\n📊 Results validation:");
    console.log(`✅ Total duration: ${result.totalTestDurationMs}ms`);
    console.log(`✅ Documents indexed: ${result.indexingData.totalDocuments}`);
    console.log(
      `✅ Documents updated: ${result.updateData.totalDocumentsUpdated}`
    );
    console.log(
      `✅ Full-text searches: ${result.searchData.fullTextSearchResults.length}`
    );
    console.log(
      `✅ Fuzzy searches: ${result.searchData.fuzzySearchResults.length}`
    );

    console.log("\n💾 Testing persistence integration...");

    const rawBenchmarkData = {
      config: result.config,
      indexingData: {
        totalDocuments: result.indexingData.totalDocuments,
        totalBatches: result.indexingData.totalBatches,
        batchResults: result.indexingData.batchResults,
        refreshTimeMs: result.indexingData.refreshTimeMs,
      },
      updateData: {
        totalDocumentsUpdated: result.updateData.totalDocumentsUpdated,
        totalUpdateBatches: result.updateData.totalUpdateBatches,
        updateBatchResults: result.updateData.updateBatchResults,
        reindexingTimeMs: result.updateData.reindexingTimeMs,
      },
      searchData: {
        fullTextSearchResults: result.searchData.fullTextSearchResults,
        fuzzySearchResults: result.searchData.fuzzySearchResults,
      },
      totalTestDurationMs: result.totalTestDurationMs,
    };

    const savedFilePath = await saveBenchmarkResults(rawBenchmarkData);
    console.log(`✅ Results saved to: ${savedFilePath}`);

    console.log("\n🎉 Benchmark runner test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  testBenchmarkRunner();
}
