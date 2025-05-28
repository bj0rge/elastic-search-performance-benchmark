export type IndexType = "standard" | "ngram" | "stemming";

export type BenchmarkConfig = {
  // Index configuration
  indexName: string;
  indexType: IndexType;
  chartName?: string;

  // Logging
  verbose: boolean;

  // Data configuration
  numberOfBatches: number;
  documentsPerBatch: number;
  descriptionLength: number;

  // Update configuration
  updateConfig: {
    numberOfUpdateBatches: number;
    documentsPerUpdateBatch: number;
  };

  // Search configuration
  searchQueries: {
    fullTextSearch: {
      fields: string[];
      terms: string[];
    };
    fuzzySearch: {
      field: string;
      terms: string[];
      fuzziness: string | number;
    };
  };
};

export type IndexingMetrics = {
  totalDocuments: number;
  totalBatches: number;
  batchResults: {
    batchNumber: number;
    documentsInBatch: number;
    indexingTimeMs: number;
    errors: boolean;
    errorCount?: number;
  }[];
  totalIndexingTimeMs: number;
  averageTimePerDocumentMs: number;
  averageTimePerBatchMs: number;
  refreshTimeMs: number;
};

export type UpdateMetrics = {
  totalDocumentsUpdated: number;
  totalUpdateBatches: number;
  updateBatchResults: {
    batchNumber: number;
    documentsInBatch: number;
    updateTimeMs: number;
    errors: boolean;
    errorCount?: number;
  }[];
  totalUpdateTimeMs: number;
  averageTimePerUpdateMs: number;
  averageTimePerUpdateBatchMs: number;
  reindexingTimeMs: number;
};

export type SearchMetrics = {
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
  averageFullTextSearchTimeMs: number;
  averageFuzzySearchTimeMs: number;
};

export type BenchmarkResult = {
  // Metadata
  timestamp: string;
  testId: string;

  // Configuration used
  config: BenchmarkConfig;

  // Time metrics
  indexingMetrics: IndexingMetrics;
  updateMetrics: UpdateMetrics;
  searchMetrics: SearchMetrics;

  // Global metrics
  totalTestDurationMs: number;
};
