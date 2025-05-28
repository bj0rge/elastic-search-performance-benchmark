import { runCampaign } from "../campaign";
import {
  createBaseConfig,
  createCampaignConfig,
} from "../campaign/config-factory";
import { createMockRunner } from "../campaign/runner-factory";
import { logCampaignResult } from "../utils";
import type { CampaignConfig } from "../campaign/types";

const createTestCampaignConfig = (): CampaignConfig => {
  const baseConfig = createBaseConfig({
    indexName: "campaign-test",
    indexType: "standard",
    batches: 10,
    docsPerBatch: 100,
    descLength: 1,
    verbose: true,
  });

  return createCampaignConfig(
    baseConfig,
    "documentsPerBatch",
    100,
    1000,
    300,
    2
  );
};

const testCampaign = async () => {
  console.log("🧪 Testing Campaign Runner...\n");

  try {
    const campaignConfig = createTestCampaignConfig();
    const mockRunner = createMockRunner();

    console.log("Expected runs: 4 configs × 2 repetitions = 8 total runs\n");

    const result = await runCampaign(campaignConfig, mockRunner, {
      verbose: true,
    });

    logCampaignResult(result, true);
    console.log("\n🎉 Campaign test completed successfully!");
  } catch (error) {
    console.error("\n❌ Campaign test failed:", error);
    process.exit(1);
  }
};

// Test with IndexType variation as well
const testIndexTypeCampaign = async () => {
  console.log("\n🧪 Testing IndexType Campaign...\n");

  try {
    const baseConfig = createBaseConfig({
      indexName: "index-type-test",
      indexType: "standard",
      batches: 5,
      docsPerBatch: 100,
      descLength: 1,
      verbose: true,
    });

    const campaignConfig = createCampaignConfig(
      baseConfig,
      "indexType",
      0,
      0,
      0,
      1,
      ["standard", "ngram", "stemming"]
    );

    const mockRunner = createMockRunner();
    const result = await runCampaign(campaignConfig, mockRunner, {
      verbose: true,
    });

    logCampaignResult(result, true);
    console.log("\n🎉 IndexType campaign test completed successfully!");
  } catch (error) {
    console.error("\n❌ IndexType campaign test failed:", error);
    process.exit(1);
  }
};

const runAllTests = async () => {
  await testCampaign();
  await testIndexTypeCampaign();
};

if (require.main === module) {
  runAllTests();
}
