import { runCampaign } from "../campaign";
import {
  createBaseConfig,
  createCampaignConfig,
} from "../campaign/config-factory";
import { createBenchmarkRunner, type VariableType } from "../campaign";
import { logCampaignResult } from "../utils";
import type { IndexType } from "../types";

type CLIArgs = {
  variable: VariableType;
  min: number;
  max: number;
  increment: number;
  repetitions: number;
  indexType?: IndexType;
  batches?: number;
  docsPerBatch?: number;
  descLength?: number;
  verbose?: boolean;
  help?: boolean;
};

const parseArgs = (): CLIArgs => {
  const args = process.argv.slice(2);
  const parsed: Partial<CLIArgs> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case "--variable":
        parsed.variable = value as VariableType;
        i++;
        break;
      case "--min":
        parsed.min = parseInt(value);
        i++;
        break;
      case "--max":
        parsed.max = parseInt(value);
        i++;
        break;
      case "--increment":
        parsed.increment = parseInt(value);
        i++;
        break;
      case "--repetitions":
        parsed.repetitions = parseInt(value);
        i++;
        break;
      case "--index-type":
        parsed.indexType = value as IndexType;
        i++;
        break;
      case "--batches":
        parsed.batches = parseInt(value);
        i++;
        break;
      case "--docs-per-batch":
        parsed.docsPerBatch = parseInt(value);
        i++;
        break;
      case "--desc-length":
        parsed.descLength = parseInt(value);
        i++;
        break;
      case "--verbose":
        parsed.verbose = true;
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
    }
  }

  return parsed as CLIArgs;
};

const showHelp = () => {
  console.log(`
🎯 Elasticsearch Benchmark Campaign CLI

Usage: npm run campaign:cli -- [options]

Required Options:
  --variable <type>       Variable to vary (numberOfBatches, documentsPerBatch, descriptionLength, indexType)
  --min <number>          Minimum value for the variable
  --max <number>          Maximum value for the variable
  --increment <number>    Increment step for the variable
  --repetitions <number>  Number of times to repeat each configuration

Optional Configuration:
  --index-type <type>     Base index type (standard, ngram, stemming) [default: standard]
  --batches <number>      Base number of batches [default: 10]
  --docs-per-batch <num>  Base documents per batch [default: 100]
  --desc-length <number>  Base description length [default: 1]
  --verbose               Enable verbose logging [default: false]
  --help, -h              Show this help message

Examples:
  # Vary documents per batch from 100 to 1000, increment by 300, repeat 3 times
  npm run campaign:cli -- --variable documentsPerBatch --min 100 --max 1000 --increment 300 --repetitions 3

  # Vary description length from 1 to 10, increment by 2, repeat 2 times
  npm run campaign:cli -- --variable descriptionLength --min 1 --max 10 --increment 2 --repetitions 2

  # Vary number of batches from 5 to 50, increment by 15, with custom base config
  npm run campaign:cli -- --variable numberOfBatches --min 5 --max 50 --increment 15 --repetitions 1 --docs-per-batch 500 --desc-length 3

  # Test different index types (special case - min/max/increment ignored)
  npm run campaign:cli -- --variable indexType --min 0 --max 0 --increment 0 --repetitions 2 --batches 20 --docs-per-batch 300
`);
};

const validateArgs = (args: CLIArgs): string[] => {
  const errors: string[] = [];

  if (!args.variable) {
    errors.push("--variable is required");
  } else if (
    ![
      "numberOfBatches",
      "documentsPerBatch",
      "descriptionLength",
      "indexType",
      "numberOfUpdateBatches",
      "documentsPerUpdateBatch",
      "fuzziness",
    ].includes(args.variable)
  ) {
    errors.push(
      "--variable must be one of: numberOfBatches, documentsPerBatch, descriptionLength, indexType, numberOfUpdateBatches, documentsPerUpdateBatch, fuzziness"
    );
  }

  if (args.variable !== "indexType") {
    if (isNaN(args.min)) errors.push("--min must be a valid number");
    if (isNaN(args.max)) errors.push("--max must be a valid number");
    if (isNaN(args.increment))
      errors.push("--increment must be a valid number");
    if (args.min >= args.max) errors.push("--min must be less than --max");
    if (args.increment <= 0) errors.push("--increment must be positive");
  }

  if (isNaN(args.repetitions) || args.repetitions <= 0) {
    errors.push("--repetitions must be a positive number");
  }

  return errors;
};

const runCLI = async () => {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  const errors = validateArgs(args);
  if (errors.length > 0) {
    console.error("❌ Validation errors:");
    errors.forEach((error) => console.error(`\t- ${error}`));
    console.error("\nUse --help for usage information.");
    process.exit(1);
  }

  console.log("🎯 Starting Campaign from CLI...\n");

  try {
    const baseConfig = createBaseConfig({
      indexName: `cli-campaign-${args.variable}`,
      indexType: args.indexType,
      batches: args.batches,
      docsPerBatch: args.docsPerBatch,
      descLength: args.descLength,
      verbose: args.verbose,
    });

    const campaignConfig = createCampaignConfig(
      baseConfig,
      args.variable,
      args.min,
      args.max,
      args.increment,
      args.repetitions,
      args.variable === "indexType"
        ? ["standard", "ngram", "stemming"]
        : undefined
    );

    console.log("📋 Campaign Configuration:");
    console.log(`\t- Variable: ${args.variable}`);
    if (args.variable !== "indexType") {
      console.log(
        `\t- Range: ${args.min} to ${args.max} (increment: ${args.increment})`
      );
    } else {
      console.log(`\t- Values: standard, ngram, stemming`);
    }
    console.log(`\t- Repetitions: ${args.repetitions}`);
    console.log(
      `\t- Base config: ${baseConfig.numberOfBatches} batches × ${baseConfig.documentsPerBatch} docs × ${baseConfig.descriptionLength} lines`
    );
    console.log("");

    const benchmarkRunner = createBenchmarkRunner({
      verbose: args.verbose,
      cleanup: {
        deleteIndexBefore: true,
        deleteIndexAfter: true,
      },
    });

    const result = await runCampaign(campaignConfig, benchmarkRunner, {
      verbose: args.verbose,
    });

    logCampaignResult(result, args.verbose);
    console.log("\n🎉 CLI Campaign completed successfully!");
    console.log(
      `📁 Results saved to ${result.results.length} files in data/results/`
    );
  } catch (error) {
    console.error("❌ CLI Campaign failed:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  runCLI();
}
