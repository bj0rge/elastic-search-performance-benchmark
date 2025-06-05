import { Client } from "@elastic/elasticsearch";
import { elasticSdk } from "../sdk";
import {
  createDataGenerator,
  DataGenerator,
} from "../generator/product-generator";
import {
  createStandardIndexConfig,
  createNGramIndexConfig,
  createStemmingIndexConfig,
} from "../config/index-configs";
import {
  executeIndexingPhase,
  executeUpdatePhase,
  executeSearchPhase,
} from "./phases";
import type { BenchmarkContext } from "./phases/benchmark-context";
import type { BenchmarkConfig, IndexType, Product } from "../types";
import type { IndexingPhaseResult } from "./phases/indexing-phase";
import type { UpdatePhaseResult } from "./phases/update-phase";
import type { SearchPhaseResult } from "./phases/search-phase";
import { buildLogger, DEFAULT_CORPUS_PATH, type Logger } from "../utils";

type BenchmarkRunnerResult = {
  config: BenchmarkConfig;
  indexingData: IndexingPhaseResult;
  updateData: UpdatePhaseResult;
  searchData: SearchPhaseResult;
  totalTestDurationMs: number;
};

type RunnerOptions = {
  corpusPath?: string;
  cleanup?: {
    deleteIndexAfter?: boolean;
    deleteIndexBefore?: boolean;
  };

  verbose?: boolean;

  phases?: {
    indexing?: boolean;
    updates?: boolean;
    search?: boolean;
  };
};

function generateOptionsFromDefaults(
  options: RunnerOptions
): Required<RunnerOptions> {
  return {
    corpusPath: options.corpusPath || DEFAULT_CORPUS_PATH,
    cleanup: {
      deleteIndexBefore: true,
      deleteIndexAfter: false,
      ...options.cleanup,
    },
    verbose: options.verbose ?? true,
    phases: {
      indexing: true,
      updates: true,
      search: true,
      ...options.phases,
    },
  };
}

export const runBenchmark = async (
  config: BenchmarkConfig,
  options: RunnerOptions = {}
): Promise<BenchmarkRunnerResult> => {
  const startTime = Date.now();
  const opts = generateOptionsFromDefaults(options);
  const logger = buildLogger(opts.verbose);

  logger.log(`🚀 Starting benchmark: ${config.indexName}`);
  logger.log(`📊 Configuration:`);
  logger.log(`\t- Index type: ${config.indexType}`);
  logger.log(
    `\t- Documents: ${config.numberOfBatches} * ${config.documentsPerBatch} = ${
      config.numberOfBatches * config.documentsPerBatch
    }`
  );
  logger.log(`\t- Description length: ${config.descriptionWordLength} lines`);
  logger.log(
    `\t- Phases: ${Object.entries(opts.phases)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name)
      .join(", ")}`
  );

  const client = elasticSdk.createElasticsearchClient();

  try {
    await healthCheck(client, logger);

    logger.log(`📚 Loading corpus from: ${opts.corpusPath}`);
    const dataGenerator = createDataGenerator(opts.corpusPath);

    if (opts.cleanup.deleteIndexBefore) {
      logger.log(`🗑️  Deleting existing index: ${config.indexName}`);
      await elasticSdk.deleteIndex(client, config.indexName);
    }

    logger.log(
      `🏗️  Creating index: ${config.indexName} (type: ${config.indexType})`
    );
    const indexConfig = createIndexConfig(config.indexName, config.indexType);
    await elasticSdk.createIndex(client, indexConfig);

    const context = generateContext({
      config,
      dataGenerator,
      client,
      startTime,
    });

    let indexingResult: IndexingPhaseResult;
    let updateResult: UpdatePhaseResult = {
      totalDocumentsUpdated: 0,
      totalUpdateBatches: 0,
      updateBatchResults: [],
      reindexingTimeMs: 0,
    };
    let searchResult: SearchPhaseResult = {
      fullTextSearchResults: [],
      fuzzySearchResults: [],
    };

    if (opts.phases.indexing) {
      logger.log(`\n═══════════════════════════════════════`);
      logger.log(`🔄 INDEXING PHASE`);
      logger.log(`═══════════════════════════════════════`);

      indexingResult = await executeIndexingPhase(context);

      context.indexedProducts = indexingResult.indexedProducts;
    } else {
      throw new Error("Indexing phase is required and cannot be skipped");
    }

    if (opts.phases.updates) {
      logger.log(`\n═══════════════════════════════════════`);
      logger.log(`🔄 UPDATE PHASE`);
      logger.log(`═══════════════════════════════════════`);

      context.dataGenerator.generateProductUpdates = (
        count: number,
        descriptionWordLength: number
      ) => {
        const availableProducts = context.indexedProducts.slice(0, count);
        return availableProducts.map((product) => ({
          id: product.id,
          updates: dataGenerator.generateProductUpdate(descriptionWordLength),
        }));
      };

      updateResult = await executeUpdatePhase(context);
    }

    if (opts.phases.search) {
      logger.log(`\n═══════════════════════════════════════`);
      logger.log(`🔄 SEARCH PHASE`);
      logger.log(`═══════════════════════════════════════`);

      searchResult = await executeSearchPhase(context);
    }

    if (opts.cleanup.deleteIndexAfter) {
      logger.log(`\n🗑️  Cleaning up index: ${config.indexName}`);
      await elasticSdk.deleteIndex(client, config.indexName);
    }

    const totalTestDurationMs = Date.now() - startTime;
    const result: BenchmarkRunnerResult = {
      config,
      indexingData: indexingResult,
      updateData: updateResult,
      searchData: searchResult,
      totalTestDurationMs,
    };

    logger.log(`\n🎉 Benchmark completed successfully!`);
    logger.log(
      `⏱️  Total duration: ${totalTestDurationMs}ms (${(
        totalTestDurationMs / 1000
      ).toFixed(2)}s)`
    );
    logger.log(`📊 Results summary:`);
    logger.log(`\t- Documents indexed: ${indexingResult.totalDocuments}`);
    logger.log(`\t- Documents updated: ${updateResult.totalDocumentsUpdated}`);
    logger.log(
      `\t- Full-text searches: ${searchResult.fullTextSearchResults.length}`
    );
    logger.log(`\t- Fuzzy searches: ${searchResult.fuzzySearchResults.length}`);

    return result;
  } catch (error) {
    try {
      if (opts.cleanup.deleteIndexAfter || opts.cleanup.deleteIndexBefore) {
        await elasticSdk.deleteIndex(client, config.indexName);
      }
    } catch (cleanupError) {
      logger.warn(`⚠️  Failed to cleanup index after error:`, cleanupError);
    }

    logger.error(`❌ Benchmark failed:`, error);
    throw new Error(
      `Benchmark failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

const healthCheck = async (client: Client, logger: Logger) => {
  logger.log(`🔍 Checking Elasticsearch health...`);
  const isHealthy = await elasticSdk.healthCheck(client);
  if (!isHealthy) {
    throw new Error("Elasticsearch is not healthy");
  }
  logger.log(`✅ Elasticsearch is healthy`);
};

const createIndexConfig = (indexName: string, indexType: IndexType) => {
  switch (indexType) {
    case "standard":
      return createStandardIndexConfig(indexName);
    case "ngram":
      return createNGramIndexConfig(indexName);
    case "stemming":
      return createStemmingIndexConfig(indexName);
    default:
      throw new Error(`Unknown index type: ${indexType}`);
  }
};

const generateContext = ({
  config,
  dataGenerator,
  client,
  startTime,
}: {
  config: BenchmarkConfig;
  dataGenerator: DataGenerator; // Le type complet
  client: Client;
  startTime: number;
}): BenchmarkContext => {
  return {
    client,
    dataGenerator: {
      generateProducts: (count: number, descriptionLength: number) =>
        dataGenerator.generateProducts(count, descriptionLength),
      generateProductsAsync: (count: number, descriptionLength: number) =>
        dataGenerator.generateProductsAsync(count, descriptionLength),
      generateProductsStream: (count: number, descriptionLength: number) =>
        dataGenerator.generateProductsStream(count, descriptionLength),
      generateProductUpdates: (count: number, descriptionLength: number) =>
        dataGenerator
          .generateProductUpdates(count, descriptionLength)
          .map((update, index) => ({
            id: `temp-id-${index}`, // Sera remplacé par les vrais IDs
            updates: update,
          })),
    },
    indexedProducts: [] as Product[],
    startTime,
    config,
  };
};
