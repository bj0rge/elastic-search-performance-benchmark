import { generateConfigurations } from "./config-generator";
import { buildLogger } from "../utils";
import type { CampaignConfig, CampaignResult, BenchmarkRunner } from "./types";

const generateCampaignId = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `campaign_${timestamp}`;
};

const logCampaignStart = (
  logger: ReturnType<typeof buildLogger>,
  campaignId: string,
  campaignConfig: CampaignConfig,
  totalRuns: number,
  numConfigs: number
) => {
  logger.log(`🚀 Starting campaign: ${campaignId}`);
  logger.log(`📊 Campaign configuration:`);
  logger.log(`\t- Variable: ${campaignConfig.variations.variable}`);
  logger.log(
    `\t- Range: ${campaignConfig.variations.min} to ${campaignConfig.variations.max}`
  );
  logger.log(`\t- Increment: ${campaignConfig.variations.increment}`);
  logger.log(`\t- Repetitions: ${campaignConfig.repetitions}`);
  logger.log(
    `\t- Total runs: ${totalRuns} (${numConfigs} configs × ${campaignConfig.repetitions} repetitions)`
  );
};

const executeConfiguration = async (
  config: any,
  configIndex: number,
  totalConfigs: number,
  campaignConfig: CampaignConfig,
  benchmarkRunner: BenchmarkRunner,
  logger: ReturnType<typeof buildLogger>,
  results: string[]
): Promise<{ completedRuns: number; failedRuns: number }> => {
  let completedRuns = 0;
  let failedRuns = 0;

  logger.log(`\n═══════════════════════════════════════`);
  logger.log(`🔄 Configuration ${configIndex + 1}/${totalConfigs}`);
  logger.log(
    `📋 ${campaignConfig.variations.variable}: ${getConfigValue(
      config,
      campaignConfig.variations.variable
    )}`
  );
  logger.log(`═══════════════════════════════════════`);

  for (
    let repetition = 1;
    repetition <= campaignConfig.repetitions;
    repetition++
  ) {
    logger.log(
      `\n🔄 Run ${repetition}/${campaignConfig.repetitions} for this configuration...`
    );

    try {
      const result = await benchmarkRunner(config);
      completedRuns++;

      if (typeof result === "string") {
        results.push(result);
      }

      logger.log(`✅ Run ${repetition} completed successfully`);
    } catch (error) {
      failedRuns++;
      logger.error(`❌ Run ${repetition} failed:`, error);
    }
  }

  return { completedRuns, failedRuns };
};

const logCampaignSummary = (
  logger: ReturnType<typeof buildLogger>,
  totalRuns: number,
  completedRuns: number,
  failedRuns: number,
  executionTimeMs: number
) => {
  logger.log(`\n🎉 Campaign completed!`);
  logger.log(`📊 Summary:`);
  logger.log(`\t- Total runs: ${totalRuns}`);
  logger.log(`\t- Successful: ${completedRuns}`);
  logger.log(`\t- Failed: ${failedRuns}`);
  logger.log(
    `\t- Success rate: ${((completedRuns / totalRuns) * 100).toFixed(1)}%`
  );
  logger.log(
    `\t- Total duration: ${executionTimeMs}ms (${(
      executionTimeMs / 1000
    ).toFixed(2)}s)`
  );
  logger.log(
    `\t- Average per run: ${(executionTimeMs / totalRuns).toFixed(2)}ms`
  );
};

export const runCampaign = async (
  campaignConfig: CampaignConfig,
  benchmarkRunner: BenchmarkRunner,
  options: { verbose?: boolean } = {}
): Promise<CampaignResult> => {
  const startTime = Date.now();
  const campaignId = generateCampaignId();
  const logger = buildLogger(options.verbose ?? true);

  const configurations = generateConfigurations(
    campaignConfig.baseConfig,
    campaignConfig.variations
  );

  const totalRuns = configurations.length * campaignConfig.repetitions;
  logCampaignStart(
    logger,
    campaignId,
    campaignConfig,
    totalRuns,
    configurations.length
  );

  let completedRuns = 0;
  let failedRuns = 0;
  const results: string[] = [];

  try {
    for (
      let configIndex = 0;
      configIndex < configurations.length;
      configIndex++
    ) {
      const config = configurations[configIndex];
      const { completedRuns: configCompleted, failedRuns: configFailed } =
        await executeConfiguration(
          config,
          configIndex,
          configurations.length,
          campaignConfig,
          benchmarkRunner,
          logger,
          results
        );

      completedRuns += configCompleted;
      failedRuns += configFailed;

      const progress = (
        ((completedRuns + failedRuns) / totalRuns) *
        100
      ).toFixed(1);
      logger.log(
        `📊 Campaign progress: ${progress}% (${
          completedRuns + failedRuns
        }/${totalRuns})`
      );
    }

    const executionTimeMs = Date.now() - startTime;
    const campaignResult: CampaignResult = {
      campaignId,
      timestamp: new Date().toISOString(),
      totalRuns,
      completedRuns,
      failedRuns,
      executionTimeMs,
      configurations,
      results,
    };

    logCampaignSummary(
      logger,
      totalRuns,
      completedRuns,
      failedRuns,
      executionTimeMs
    );
    return campaignResult;
  } catch (error) {
    logger.error(`❌ Campaign failed:`, error);
    throw new Error(
      `Campaign failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

const getConfigValue = (config: any, variable: string): any => {
  switch (variable) {
    case "numberOfBatches":
      return config.numberOfBatches;
    case "documentsPerBatch":
      return config.documentsPerBatch;
    case "descriptionLength":
      return config.descriptionLength;
    case "indexType":
      return config.indexType;
    case "numberOfUpdateBatches":
      return config.updateConfig?.numberOfUpdateBatches;
    case "documentsPerUpdateBatch":
      return config.updateConfig?.documentsPerUpdateBatch;
    case "fuzziness":
      return config.searchQueries?.fuzzySearch?.fuzziness;
    default:
      return "unknown";
  }
};
