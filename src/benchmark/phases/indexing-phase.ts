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
    descriptionWordLength,
    verbose,
  } = config;

  const logger = buildLogger(verbose);

  // Détecter les très gros documents et utiliser différentes stratégies
  if (descriptionWordLength > 100000) {
    logger.log(
      `🚨 Very large documents detected: ${descriptionWordLength.toLocaleString()} words per document`
    );
    logger.log(`🔧 Switching to streaming mode for memory efficiency`);

    return await executeIndexingPhaseStreaming(context);
  } else if (descriptionWordLength > 10000) {
    logger.log(
      `⚠️  Large documents detected: ${descriptionWordLength.toLocaleString()} words per document`
    );
    logger.log(`🔧 Using async generation with smaller batches`);

    return await executeIndexingPhaseAsync(context);
  }

  // Mode normal pour les petits documents
  return await executeIndexingPhaseNormal(context);
};

// Mode normal pour les petits documents (<=10k mots)
const executeIndexingPhaseNormal = async (
  context: BenchmarkContext
): Promise<IndexingPhaseResult> => {
  const { client, dataGenerator, config } = context;
  const {
    indexName,
    numberOfBatches,
    documentsPerBatch,
    descriptionWordLength,
    verbose,
  } = config;

  const logger = buildLogger(verbose);

  logger.log(
    `🔄 Starting NORMAL indexing phase: ${numberOfBatches} batches of ${documentsPerBatch} documents`
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
        descriptionWordLength
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

    return await finalizeIndexingPhase(context, {
      totalDocuments,
      numberOfBatches,
      batchResults,
      indexedProducts,
    });
  } catch (error) {
    logger.error(`❌ Normal indexing phase failed:`, error);
    throw new Error(
      `Indexing phase failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// Mode async pour les documents moyens (10k-100k mots)
const executeIndexingPhaseAsync = async (
  context: BenchmarkContext
): Promise<IndexingPhaseResult> => {
  const { client, dataGenerator, config } = context;
  const {
    indexName,
    numberOfBatches,
    documentsPerBatch,
    descriptionWordLength,
    verbose,
  } = config;

  const logger = buildLogger(verbose);

  // Réduire la taille des batches pour les documents moyens
  const reducedBatchSize = Math.min(documentsPerBatch, 50);

  logger.log(
    `🔄 Starting ASYNC indexing phase: ${numberOfBatches} batches of ${reducedBatchSize} documents`
  );
  logger.log(
    `📊 Document size: ${descriptionWordLength?.toLocaleString()} words each`
  );

  const batchResults: IndexingPhaseResult["batchResults"] = [];
  const indexedProducts: Product[] = [];
  let totalDocuments = 0;

  try {
    for (let batchNumber = 1; batchNumber <= numberOfBatches; batchNumber++) {
      logger.info(
        `\t⚡️ Processing async batch ${batchNumber}/${numberOfBatches}...`
      );

      const batchStartTime = Date.now();

      const products = await dataGenerator.generateProductsAsync(
        reducedBatchSize,
        descriptionWordLength
      );

      logger.log(`\t📤 Indexing ${products.length} documents...`);

      const bulkResult = await elasticSdk.bulkIndex(
        client,
        indexName,
        products
      );
      const batchDuration = Date.now() - batchStartTime;

      // Pour les documents moyens, garder seulement les métadonnées
      const lightProducts = products.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        description: p.description.substring(0, 200) + "...", // Aperçu seulement
      })) as Product[];

      indexedProducts.push(...lightProducts);
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

      logger.log(
        `\t\t✅ Async batch ${batchNumber} completed in ${(
          batchDuration / 1000
        ).toFixed(1)}s`
      );

      if (bulkResult.errors) {
        logger.warn(
          `\t\t⚠️  Batch ${batchNumber} had ${batchResult.errorCount} errors`
        );
      }

      // Forcer le GC après chaque batch pour les documents moyens
      if (global.gc) {
        global.gc();
      }
    }

    return await finalizeIndexingPhase(context, {
      totalDocuments,
      numberOfBatches,
      batchResults,
      indexedProducts,
    });
  } catch (error) {
    logger.error(`❌ Async indexing phase failed:`, error);
    throw error;
  }
};

// Mode streaming pour les très gros documents (>100k mots)
const executeIndexingPhaseStreaming = async (
  context: BenchmarkContext
): Promise<IndexingPhaseResult> => {
  const { client, dataGenerator, config } = context;
  const {
    indexName,
    numberOfBatches,
    documentsPerBatch,
    descriptionWordLength,
    verbose,
  } = config;

  const logger = buildLogger(verbose);

  logger.log(`🔄 Starting STREAMING indexing phase for very large documents`);
  logger.log(
    `📊 Target: ${numberOfBatches} batches × ${documentsPerBatch} documents = ${
      numberOfBatches * documentsPerBatch
    } total documents`
  );
  logger.log(
    `📄 Document size: ${descriptionWordLength?.toLocaleString()} words each`
  );

  const batchResults: IndexingPhaseResult["batchResults"] = [];
  const indexedProductsMetadata: Partial<Product>[] = [];
  let totalDocuments = 0;

  try {
    for (let batchNumber = 1; batchNumber <= numberOfBatches; batchNumber++) {
      logger.info(
        `\n⚡️ Processing streaming batch ${batchNumber}/${numberOfBatches}...`
      );
      const batchStartTime = Date.now();
      let batchDocuments = 0;
      let batchErrors = 0;

      // Utiliser le générateur streaming pour traiter un document à la fois
      const productStream = dataGenerator.generateProductsStream(
        documentsPerBatch,
        descriptionWordLength
      );

      let docNumber = 1;
      for await (const product of productStream) {
        try {
          logger.log(
            `  📤 Indexing document ${docNumber}/${documentsPerBatch}...`
          );

          // Indexer UN SEUL document à la fois
          const bulkResult = await elasticSdk.bulkIndex(client, indexName, [
            product,
          ]);

          if (bulkResult.errors) {
            batchErrors++;
            logger.warn(`  ⚠️  Document ${docNumber} had indexing errors`);
          } else {
            batchDocuments++;
            totalDocuments++;

            // Garder seulement les métadonnées essentielles
            indexedProductsMetadata.push({
              id: product.id,
              name: product.name,
              createdAt: product.createdAt,
            });
          }

          docNumber++;
        } catch (error) {
          batchErrors++;
          logger.error(`  ❌ Document ${docNumber} failed:`, error);
          docNumber++;
        }

        // Log mémoire tous les 50 documents
        if (docNumber % 50 === 0) {
          const memUsage = process.memoryUsage();
          logger.info(
            `  💾 Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap`
          );
        }
      }

      const batchDuration = Date.now() - batchStartTime;

      const batchResult = {
        batchNumber,
        documentsInBatch: batchDocuments,
        indexingTimeMs: batchDuration,
        errors: batchErrors > 0,
        errorCount: batchErrors,
      };

      batchResults.push(batchResult);

      logger.log(
        `✅ Streaming batch ${batchNumber} completed: ${batchDocuments}/${documentsPerBatch} documents in ${(
          batchDuration / 1000
        ).toFixed(1)}s`
      );

      if (batchErrors > 0) {
        logger.warn(`⚠️  Batch ${batchNumber} had ${batchErrors} errors`);
      }
    }

    return await finalizeIndexingPhase(context, {
      totalDocuments,
      numberOfBatches,
      batchResults,
      indexedProducts: indexedProductsMetadata as Product[],
    });
  } catch (error) {
    logger.error(`❌ Streaming indexing failed:`, error);
    throw error;
  }
};

// Fonction commune pour finaliser l'indexation
const finalizeIndexingPhase = async (
  context: BenchmarkContext,
  data: {
    totalDocuments: number;
    numberOfBatches: number;
    batchResults: any[];
    indexedProducts: Product[];
  }
): Promise<IndexingPhaseResult> => {
  const { client, config } = context;
  const { indexName, verbose } = config;
  const logger = buildLogger(verbose);

  logger.log(`🔄 Refreshing index ${indexName}...`);
  const refreshStartTime = Date.now();
  await elasticSdk.refreshIndex(client, indexName);
  const refreshTimeMs = Date.now() - refreshStartTime;
  logger.log(`✅ Index refreshed in ${refreshTimeMs}ms`);

  const actualDocCount = await elasticSdk.countDocuments(client, indexName);
  logger.log(
    `📊 Index contains ${actualDocCount.toLocaleString()} documents (expected: ${data.totalDocuments.toLocaleString()})`
  );

  const result: IndexingPhaseResult = {
    totalDocuments: data.totalDocuments,
    totalBatches: data.numberOfBatches,
    batchResults: data.batchResults,
    refreshTimeMs,
    indexedProducts: data.indexedProducts,
  };

  logger.log(
    `🎉 Indexing completed: ${data.totalDocuments.toLocaleString()} documents in ${
      data.batchResults.length
    } batches`
  );
  return result;
};
