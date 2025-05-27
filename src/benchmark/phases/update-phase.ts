import { elasticSdk } from "../../sdk";
import type { BenchmarkContext } from "./benchmark-context";
import { buildLogger } from "../../utils";

export type UpdatePhaseResult = {
  totalDocumentsUpdated: number;
  totalUpdateBatches: number;
  updateBatchResults: Array<{
    batchNumber: number;
    documentsInBatch: number;
    updateTimeMs: number;
    errors: boolean;
    errorCount?: number;
  }>;
  reindexingTimeMs: number;
};

export const executeUpdatePhase = async (
  context: BenchmarkContext
): Promise<UpdatePhaseResult> => {
  const { client, dataGenerator, config, indexedProducts } = context;
  const { indexName, updateConfig, descriptionLength, verbose } = config;
  const { numberOfUpdateBatches, documentsPerUpdateBatch } = updateConfig;

  const logger = buildLogger(verbose);

  logger.log(
    `🔄 Starting update phase: ${numberOfUpdateBatches} batches of ${documentsPerUpdateBatch} updates`
  );

  if (indexedProducts.length === 0) {
    throw new Error(
      "No indexed products available for updates. Run indexing phase first."
    );
  }

  const totalUpdatesRequested = numberOfUpdateBatches * documentsPerUpdateBatch;
  const totalUpdatesToPerform = Math.min(
    indexedProducts.length,
    totalUpdatesRequested
  );

  logger.log(`📊 Available for update: ${indexedProducts.length} products`);
  logger.log(`📊 Updates to perform: ${totalUpdatesToPerform}`);

  if (totalUpdatesToPerform === 0) {
    logger.warn("⚠️  No updates to perform");
    return {
      totalDocumentsUpdated: 0,
      totalUpdateBatches: 0,
      updateBatchResults: [],
      reindexingTimeMs: 0,
    };
  }

  const updateBatchResults: UpdatePhaseResult["updateBatchResults"] = [];
  let totalDocumentsUpdated = 0;

  try {
    const productsToUpdate = indexedProducts.slice(0, totalUpdatesToPerform);

    const actualBatches = Math.ceil(
      totalUpdatesToPerform / documentsPerUpdateBatch
    );

    for (let batchNumber = 1; batchNumber <= actualBatches; batchNumber++) {
      const batchStartTime = Date.now();

      const startIndex = (batchNumber - 1) * documentsPerUpdateBatch;
      const endIndex = Math.min(
        startIndex + documentsPerUpdateBatch,
        totalUpdatesToPerform
      );
      const batchProducts = productsToUpdate.slice(startIndex, endIndex);

      logger.log(
        `t📦 Processing update batch ${batchNumber}/${actualBatches} (${batchProducts.length} updates)...`
      );

      const updates = batchProducts.map((product) => ({
        id: product.id,
        updates: dataGenerator.generateProductUpdates(1, descriptionLength)[0],
      }));

      const updateResult = await elasticSdk.bulkUpdateDocuments(
        client,
        indexName,
        updates
      );
      const batchDuration = Date.now() - batchStartTime;

      totalDocumentsUpdated += updateResult.updated;

      const batchResult = {
        batchNumber,
        documentsInBatch: batchProducts.length,
        updateTimeMs: batchDuration,
        errors: updateResult.errors,
        errorCount: updateResult.failed,
      };

      updateBatchResults.push(batchResult);

      logger.log(
        `\t\t✅ Update batch ${batchNumber} completed in ${batchDuration}ms`
      );
      logger.log(
        `\t\t📊 Updated: ${updateResult.updated}, Failed: ${updateResult.failed}`
      );

      if (updateResult.errors) {
        logger.warn(
          `\t\t⚠️  Update batch ${batchNumber} had ${updateResult.failed} errors`
        );
      }
    }

    logger.log(`🔄 Refreshing index after updates...`);
    const reindexStartTime = Date.now();
    await elasticSdk.refreshIndex(client, indexName);
    const reindexingTimeMs = Date.now() - reindexStartTime;
    logger.log(`✅ Index refreshed in ${reindexingTimeMs}ms`);

    const result: UpdatePhaseResult = {
      totalDocumentsUpdated,
      totalUpdateBatches: actualBatches,
      updateBatchResults,
      reindexingTimeMs,
    };

    logger.log(
      `✅ Update phase completed: ${totalDocumentsUpdated} documents updated in ${actualBatches} batches`
    );
    return result;
  } catch (error) {
    logger.error(`❌ Update phase failed:`, error);
    throw new Error(
      `Update phase failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
