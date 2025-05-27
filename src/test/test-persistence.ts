import {
  saveBenchmarkResults,
  loadBenchmarkResults,
  listBenchmarkResults,
  RawBenchmarkData,
} from "../persistence";

const testPersistence = async () => {
  console.log("🧪 Testing persistence service...\n");

  const mockRawData: RawBenchmarkData = {
    config: {
      indexName: "test-products-standard",
      indexType: "standard",
      numberOfBatches: 2,
      documentsPerBatch: 5,
      descriptionLength: 1,
      updateConfig: {
        numberOfUpdateBatches: 1,
        documentsPerUpdateBatch: 3,
      },
      searchQueries: {
        fullTextSearch: {
          fields: ["name", "description"],
          terms: ["product", "test", "news"],
        },
        fuzzySearch: {
          field: "name",
          terms: ["produc", "tst", "nws"],
          fuzziness: "AUTO",
        },
      },
    },
    indexingData: {
      totalDocuments: 10,
      totalBatches: 2,
      batchResults: [
        {
          batchNumber: 1,
          documentsInBatch: 5,
          indexingTimeMs: 42,
          errors: false,
        },
        {
          batchNumber: 2,
          documentsInBatch: 5,
          indexingTimeMs: 38,
          errors: false,
        },
      ],
      refreshTimeMs: 15,
    },
    updateData: {
      totalDocumentsUpdated: 3,
      totalUpdateBatches: 1,
      updateBatchResults: [
        {
          batchNumber: 1,
          documentsInBatch: 3,
          updateTimeMs: 25,
          errors: false,
        },
      ],
      reindexingTimeMs: 8,
    },
    searchData: {
      fullTextSearchResults: [
        {
          term: "product",
          searchTimeMs: 12,
          resultsCount: 4,
          totalHits: 4,
        },
        {
          term: "test",
          searchTimeMs: 8,
          resultsCount: 0,
          totalHits: 0,
        },
        {
          term: "news",
          searchTimeMs: 10,
          resultsCount: 2,
          totalHits: 2,
        },
      ],
      fuzzySearchResults: [
        {
          term: "produc",
          fuzziness: "AUTO",
          searchTimeMs: 15,
          resultsCount: 4,
          totalHits: 4,
        },
        {
          term: "tst",
          fuzziness: "AUTO",
          searchTimeMs: 11,
          resultsCount: 0,
          totalHits: 0,
        },
        {
          term: "nws",
          fuzziness: "AUTO",
          searchTimeMs: 13,
          resultsCount: 1,
          totalHits: 1,
        },
      ],
    },
    totalTestDurationMs: 185,
  };

  try {
    console.log("1️⃣ Testing save operation...");
    const savedFilePath = await saveBenchmarkResults(mockRawData);
    console.log(`\t✅ File saved: ${savedFilePath}\n`);

    console.log("2️⃣ Testing load operation...");
    const loadedResults = await loadBenchmarkResults(savedFilePath);
    console.log(`\t✅ File loaded with testId: ${loadedResults.testId}`);
    console.log(`\t📊 Calculated metrics:`);
    console.log(
      `\t\t- Total indexing time: ${loadedResults.indexingMetrics.totalIndexingTimeMs}ms`
    );
    console.log(
      `\t\t- Average time per document: ${loadedResults.indexingMetrics.averageTimePerDocumentMs}ms`
    );
    console.log(
      `\t\t- Average time per batch: ${loadedResults.indexingMetrics.averageTimePerBatchMs}ms`
    );

    if (loadedResults.updateMetrics) {
      console.log(
        `\t\t- Total update time: ${loadedResults.updateMetrics.totalUpdateTimeMs}ms`
      );
      console.log(
        `\t\t- Average time per update: ${loadedResults.updateMetrics.averageTimePerUpdateMs}ms`
      );
    }

    console.log(
      `\t\t- Average full-text search time: ${loadedResults.searchMetrics.averageFullTextSearchTimeMs}ms`
    );
    console.log(
      `\t\t- Average fuzzy search time: ${loadedResults.searchMetrics.averageFuzzySearchTimeMs}ms\n`
    );

    // Test 3: List files
    console.log("3️⃣ Testing file listing...");
    const files = await listBenchmarkResults();
    console.log(`\t✅ Found ${files.length} benchmark file(s):`);
    files.forEach((file) => console.log(`\t\t- ${file}`));

    console.log("\n🎉 All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  testPersistence();
}
