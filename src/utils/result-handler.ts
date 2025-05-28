import type { CampaignResult } from "../campaign";
import { buildLogger } from "./logger";

export const logCampaignResult = (
  result: CampaignResult,
  verbose: boolean = true
) => {
  const logger = buildLogger(verbose);

  logger.log("\n📊 Campaign Results:");
  logger.log(`✅ Campaign ID: ${result.campaignId}`);

  if (result.configurations.length > 0 && result.configurations[0].chartName) {
    logger.log(`📈 Chart Name: "${result.configurations[0].chartName}"`);
  }

  logger.log(`✅ Total runs: ${result.totalRuns}`);
  logger.log(`✅ Completed: ${result.completedRuns}`);
  logger.log(`✅ Failed: ${result.failedRuns}`);
  logger.log(`✅ Configurations generated: ${result.configurations.length}`);
  logger.log(`✅ Results collected: ${result.results.length}`);
  logger.log(`✅ Execution time: ${result.executionTimeMs}ms`);

  if (verbose) {
    logger.log("\n📋 Generated Configurations:");
    result.configurations.forEach((config, index) => {
      logger.log(
        `Config ${index + 1}: ${config.documentsPerBatch} docs/batch (${
          config.indexName
        }) - Chart: "${config.chartName || "N/A"}"`
      );
    });
  }
};
