import { elasticSdk } from "../sdk";
import {
  createDataGenerator,
  type DataGenerator,
} from "../generator/product-generator";
import { createStandardIndexConfig } from "../config/index-configs";
import { Client } from "@elastic/elasticsearch";
import * as path from "path";

const INDEX_NAME = "test-products";
const PRODUCTS_TO_GENERATE = 10;
const PRODUCT_DESCRIPTION_LENGTH = 1;
const DOCUMENTS_TO_PRINT = 3;

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
}) => {
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
};

const searchProducts = async ({
  client,
  fullTextSearch,
  fuzzySearch,
}: {
  client: Client;
  fullTextSearch: { fields: string[]; term: string };
  fuzzySearch: { field: string; term: string };
}) => {
  console.log("Testing full-text search...");
  const searchResult = await elasticSdk.fullTextSearch(
    client,
    INDEX_NAME,
    fullTextSearch.fields,
    fullTextSearch.term
  );
  console.log(
    `✅ Search completed in ${searchResult.took}ms, found ${searchResult.hits.total} results`
  );

  console.log("Testing fuzzy search...");
  const fuzzyResult = await elasticSdk.fuzzySearch(
    client,
    INDEX_NAME,
    fuzzySearch.field,
    fuzzySearch.term,
    "AUTO"
  );
  console.log(
    `✅ Fuzzy search completed in ${fuzzyResult.took}ms, found ${fuzzyResult.hits.total} results`
  );
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
    await generateAndIndexProducts({
      client,
      dataGenerator,
      config: {
        productsToGenerate: PRODUCTS_TO_GENERATE,
        productDescriptionLength: PRODUCT_DESCRIPTION_LENGTH,
      },
    });

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
    });

    await getStats({ client });

    await cleanUp({ client });

    console.log("\n🎉 Basic test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  basicTest();
}
