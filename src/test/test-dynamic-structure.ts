import {
  generateProductStructure,
  validateProductStructureConfig,
  logProductStructure,
  type ProductStructureConfig,
} from "../generator/product-structure";
import { createDataGenerator } from "../generator/product-generator";
import { DEFAULT_CORPUS_PATH } from "../utils";
import {
  createDynamicIndexConfig,
  getSearchableFields,
} from "../config/dynamic-index-configs";

const testProductStructureGeneration = () => {
  console.log("🧪 Testing Product Structure Generation...\n");

  // Test 1: default configuration
  console.log("1️⃣ Test: Default configuration (1 additional field, 10 words)");
  const config1: ProductStructureConfig = {
    additionalFields: 1,
    totalWords: 10,
  };
  const structure1 = generateProductStructure(config1);
  logProductStructure(structure1);

  // Test 2: multiple fields
  console.log("\n2️⃣ Test: Multiple fields (5 additional fields, 100 words)");
  const config2: ProductStructureConfig = {
    additionalFields: 5,
    totalWords: 100,
  };
  const structure2 = generateProductStructure(config2);
  logProductStructure(structure2);

  // Test 3: no additional fields
  console.log(
    "\n3️⃣ Test: No additional fields (0 additional fields, 50 words)"
  );
  const config3: ProductStructureConfig = {
    additionalFields: 0,
    totalWords: 50,
  };
  const structure3 = generateProductStructure(config3);
  logProductStructure(structure3);

  // Test 4: error case (more fields than words)
  console.log("\n4️⃣ Test: Error case (10 fields, 5 words) - should fail");
  try {
    const config4: ProductStructureConfig = {
      additionalFields: 10,
      totalWords: 5,
    };
    validateProductStructureConfig(config4);
    console.log("❌ This should have failed!");
  } catch (error) {
    console.log(
      `✅ Expected error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

const testProductGeneration = async () => {
  console.log("\n🧪 Testing Product Generation with Dynamic Structure...\n");

  const dataGenerator = createDataGenerator(DEFAULT_CORPUS_PATH);

  // Test with different structures
  const structures = [
    { additionalFields: 1, totalWords: 5, name: "Single field (description)" },
    { additionalFields: 3, totalWords: 20, name: "Multiple fields" },
    { additionalFields: 0, totalWords: 0, name: "Name only" },
  ];

  for (const structConfig of structures) {
    console.log(`\n📋 Testing: ${structConfig.name}`);
    console.log(
      `   Config: ${structConfig.additionalFields} fields, ${structConfig.totalWords} words`
    );

    try {
      const structure = generateProductStructure(structConfig);

      // Generate a product
      const product = dataGenerator.generateProduct(structure);

      console.log(`   Generated product:`);
      console.log(`     - ID: ${product.id}`);
      console.log(`     - Name: ${product.name}`);
      console.log(`     - Created: ${product.createdAt}`);

      // Display dynamic fields
      structure.forEach((field) => {
        if (field.name !== "name") {
          const fieldValue = (product as any)[field.name] || "";
          const wordCount = fieldValue
            .split(/\s+/)
            .filter((w: string) => w.length > 0).length;
          console.log(
            `     - ${field.name}: ${wordCount} words - "${fieldValue.substring(
              0,
              50
            )}..."`
          );
        }
      });
    } catch (error) {
      console.log(
        `   ❌ Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
};

const testIndexConfiguration = () => {
  console.log("\n🧪 Testing Dynamic Index Configuration...\n");

  const structure = generateProductStructure({
    additionalFields: 3,
    totalWords: 30,
  });

  console.log("📋 Test structure:");
  logProductStructure(structure, true);

  console.log("\n🔧 Testing index configurations:");

  ["standard", "ngram", "stemming"].forEach((indexType) => {
    console.log(`\n   ${indexType.toUpperCase()} Index:`);

    try {
      const indexConfig = createDynamicIndexConfig(
        `test-${indexType}`,
        indexType,
        structure
      );

      console.log(`     - Index name: ${indexConfig.name}`);
      console.log(`     - Shards: ${indexConfig.settings.number_of_shards}`);
      console.log(
        `     - Replicas: ${indexConfig.settings.number_of_replicas}`
      );

      const mappedFields = Object.keys(indexConfig.mappings.properties);
      console.log(`     - Mapped fields: [${mappedFields.join(", ")}]`);

      const searchableFields = getSearchableFields(structure);
      console.log(`     - Searchable fields: [${searchableFields.join(", ")}]`);
    } catch (error) {
      console.log(
        `     ❌ Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  });
};

const runAllTests = async () => {
  console.log("🚀 Starting Dynamic Structure Tests...\n");

  try {
    testProductStructureGeneration();
    await testProductGeneration();
    testIndexConfiguration();

    console.log("\n🎉 All dynamic structure tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Tests failed:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  runAllTests();
}
