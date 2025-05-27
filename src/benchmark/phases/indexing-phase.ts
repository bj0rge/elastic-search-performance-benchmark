import { elasticSdk } from "../../sdk";
import type { Product } from "../../types";
import type { BenchmarkContext } from "./benchmark-context";
import { buildLogger } from "../../utils";

export type IndexingPhaseResult = {
  totalDocuments: number;
  totalBatches: number;
  batchResults: Array<{
    batchNumber: number;
    documentsInBatch: number;
    indexingTimeMs: number;
    errors: boolean;
    errorCount?: number;
  }>;
  refreshTimeMs: number;
  indexedProducts: Product[];
};

export const executeIndexingPhase = async (
  context: BenchmarkContext
): Promise<IndexingPhaseResult> => {
  const { client, dataGenerator, config } = context;
  const {
    indexName,
    numberOfBatches,
    documentsPerBatch,
    descriptionLength,
    verbose,
  } = config;

  const logger = buildLogger(verbose);

  logger.log(
    `🔄 Starting indexing phase: ${numberOfBatches} batches of ${documentsPerBatch} documents`
  );

  const batchResults: IndexingPhaseResult["batchResults"] = [];
  const indexedProducts: Product[] = [];
  let totalDocuments = 0;

  try {
    for (let batchNumber = 1; batchNumber <= numberOfBatches; batchNumber++) {
      logger.log(`\t📦 Processing batch ${batchNumber}/${numberOfBatches}...`);

      const batchStartTime = Date.now();

      const products = dataGenerator.generateProducts(
        documentsPerBatch,
        descriptionLength
      );

      const bulkResult = await elasticSdk.bulkIndex(
        client,
        indexName,
        products
      );
      const batchDuration = Date.now() - batchStartTime;

      indexedProducts.push(...products);
      totalDocuments += products.length;

      const batchResult = {
        batchNumber,
        documentsInBatch: products.length,
        indexingTimeMs: batchDuration,
        errors: bulkResult.errors,
        errorCount: bulkResult.errors
          ? bulkResult.items.filter((item) => item.index?.error).length
          : undefined,
      };

      batchResults.push(batchResult);

      logger.log(`\t\t✅ Batch ${batchNumber} completed in ${batchDuration}ms`);

      if (bulkResult.errors) {
        logger.warn(
          `\t\t⚠️  Batch ${batchNumber} had ${batchResult.errorCount} errors`
        );
      }
    }

    logger.log(`🔄 Refreshing index ${indexName}...`);
    const refreshStartTime = Date.now();
    await elasticSdk.refreshIndex(client, indexName);
    const refreshTimeMs = Date.now() - refreshStartTime;
    logger.log(`✅ Index refreshed in ${refreshTimeMs}ms`);

    const actualDocCount = await elasticSdk.countDocuments(client, indexName);
    logger.log(
      `📊 Index contains ${actualDocCount} documents (expected: ${totalDocuments})`
    );

    const result: IndexingPhaseResult = {
      totalDocuments,
      totalBatches: numberOfBatches,
      batchResults,
      refreshTimeMs,
      indexedProducts: indexedProducts,
    };

    logger.log(
      `✅ Indexing phase completed: ${totalDocuments} documents in ${batchResults.length} batches`
    );
    return result;
  } catch (error) {
    logger.error(`❌ Indexing phase failed:`, error);
    throw new Error(
      `Indexing phase failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
