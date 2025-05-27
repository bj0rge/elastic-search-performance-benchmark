import { elasticSdk } from "../sdk";
import {
  createDataGenerator,
  type DataGenerator,
} from "../generator/product-generator";
import { createStandardIndexConfig } from "../config/index-configs";
import { Client } from "@elastic/elasticsearch";
import * as path from "path";
import { Product } from "../types";

const INDEX_NAME = "test-products";
const PRODUCTS_TO_GENERATE = 10;
const PRODUCT_DESCRIPTION_LENGTH = 1;
const DOCUMENTS_TO_PRINT = 3;
const UPDATES_TO_PERFORM = 5;
const UPDATE_DESCRIPTION_LENGTH = 2;

const createIndex = async ({ client }: { client: Client }) => {
  const indexConfig = createStandardIndexConfig(INDEX_NAME);

  console.log("Creating test index...");
  await elasticSdk.deleteIndex(client, INDEX_NAME);
  await elasticSdk.createIndex(client, indexConfig);
  console.log("✅ Test index created");
};

const generateAndIndexProducts = async ({
  client,
  dataGenerator,
  config: { productsToGenerate, productDescriptionLength },
}: {
  client: Client;
  dataGenerator: DataGenerator;
  config: { productsToGenerate: number; productDescriptionLength: number };
}): Promise<Product[]> => {
  console.log("Generating test products...");
  const products = dataGenerator.generateProducts(
    productsToGenerate,
    productDescriptionLength
  );

  console.log("Indexing products...");
  const bulkResult = await elasticSdk.bulkIndex(client, INDEX_NAME, products);
  console.log(`✅ Indexed ${products.length} products in ${bulkResult.took}ms`);

  // Refresh index is necessary to make documents searchable
  await elasticSdk.refreshIndex(client, INDEX_NAME);

  return products;
};

const searchProducts = async ({
  client,
  fullTextSearch,
  fuzzySearch,
  searchLabel = "initial",
}: {
  client: Client;
  fullTextSearch: { fields: string[]; term: string };
  fuzzySearch: { field: string; term: string };
  searchLabel?: "initial" | "post-update";
}) => {
  console.log(`Testing ${searchLabel} full-text search...`);
  const searchResult = await elasticSdk.fullTextSearch(
    client,
    INDEX_NAME,
    fullTextSearch.fields,
    fullTextSearch.term
  );
  console.log(
    `✅ ${searchLabel} search completed in ${searchResult.took}ms, found ${searchResult.hits.total} results`
  );

  console.log(`Testing ${searchLabel} fuzzy search...`);
  const fuzzyResult = await elasticSdk.fuzzySearch(
    client,
    INDEX_NAME,
    fuzzySearch.field,
    fuzzySearch.term,
    "AUTO"
  );
  console.log(
    `✅ ${searchLabel} fuzzy search completed in ${fuzzyResult.took}ms, found ${fuzzyResult.hits.total} results`
  );

  return { searchResult, fuzzyResult };
};

const bulkUpdateProducts = async ({
  client,
  dataGenerator,
  products,
  config: { updatesToPerform, updateDescriptionLength },
}: {
  client: Client;
  dataGenerator: DataGenerator;
  products: Product[];
  config: { updatesToPerform: number; updateDescriptionLength: number };
}) => {
  console.log("Testing bulk update operations...");

  const productsToUpdate = products.slice(
    0,
    Math.min(updatesToPerform, products.length)
  );

  const updates = productsToUpdate.map((product) => ({
    id: product.id,
    updates: dataGenerator.generateProductUpdate(updateDescriptionLength),
  }));

  console.log(`Updating ${updates.length} products...`);
  const updateResult = await elasticSdk.bulkUpdateDocuments(
    client,
    INDEX_NAME,
    updates
  );

  console.log(
    `✅ Updated ${updateResult.updated} products in ${updateResult.took}ms`
  );

  if (updateResult.errors) {
    console.warn(`⚠️  ${updateResult.failed} updates failed`);
  }

  // Refresh index is necessary to make updated documents searchable
  await elasticSdk.refreshIndex(client, INDEX_NAME);

  return updateResult;
};

const getStats = async ({ client }: { client: Client }) => {
  console.log("Getting index statistics...");
  const docCount = await elasticSdk.countDocuments(client, INDEX_NAME);
  console.log(`✅ Index contains ${docCount} documents`);

  console.log(`➡️ First ${DOCUMENTS_TO_PRINT} documents in the index:`);
  const searchResult = await elasticSdk.search(
    client,
    INDEX_NAME,
    { match_all: {} },
    { size: DOCUMENTS_TO_PRINT }
  );
  searchResult.hits.hits.forEach((hit, index) => {
    console.log(`Document ${index + 1}:`);
    console.log(`\tID: ${hit._id}`);
    console.log(`\tName: ${hit._source.name}`);
    console.log(`\tDescription: ${hit._source.description}`);
    console.log(`\tCreated at: ${hit._source.createdAt}\n`);
  });
};

const cleanUp = async ({ client }: { client: Client }) => {
  await elasticSdk.deleteIndex(client, INDEX_NAME);
  console.log("✅ Test index cleaned up");
};

const basicTest = async () => {
  console.log("Starting basic Elasticsearch test...");

  const client = elasticSdk.createElasticsearchClient();
  const dataGenerator = createDataGenerator(
    path.join(__dirname, "../../data/corpus/lines.txt")
  );

  try {
    console.log("Checking Elasticsearch health...");
    const isHealthy = await elasticSdk.healthCheck(client);
    if (!isHealthy) {
      throw new Error("Elasticsearch is not healthy");
    }
    console.log("✅ Elasticsearch is healthy");

    await createIndex({ client });

    const products = await generateAndIndexProducts({
      client,
      dataGenerator,
      config: {
        productsToGenerate: PRODUCTS_TO_GENERATE,
        productDescriptionLength: PRODUCT_DESCRIPTION_LENGTH,
      },
    });

    // Initial search
    await searchProducts({
      client,
      fullTextSearch: {
        fields: ["name", "description"],
        term: "product",
      },
      fuzzySearch: {
        field: "name",
        term: "produc",
      },
      searchLabel: "initial",
    });

    await bulkUpdateProducts({
      client,
      dataGenerator,
      products,
      config: {
        updatesToPerform: UPDATES_TO_PERFORM,
        updateDescriptionLength: UPDATE_DESCRIPTION_LENGTH,
      },
    });

    // Post-update search
    await searchProducts({
      client,
      fullTextSearch: {
        fields: ["name", "description"],
        term: "product",
      },
      fuzzySearch: {
        field: "name",
        term: "produc",
      },
      searchLabel: "post-update",
    });

    await getStats({ client });

    await cleanUp({ client });

    console.log("\n🎉 Basic test with updates completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  basicTest();
}
