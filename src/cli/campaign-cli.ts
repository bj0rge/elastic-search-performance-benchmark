import { runCampaign } from "../campaign";
import {
  createBaseConfig,
  createCampaignConfig,
  generateChartName,
} from "../campaign/config-factory";
import { createBenchmarkRunner, type VariableType } from "../campaign";
import { logCampaignResult } from "../utils";
import type { IndexType } from "../types";
import { logProductStructure } from "../generator";

type CLIArgs = {
  variable: VariableType;
  min: number;
  max: number;
  increment: number;
  repetitions: number;
  indexType?: IndexType;
  batches?: number;
  docsPerBatch?: number;
  additionalFields?: number;
  totalWords?: number;
  descLength?: number;
  chartName?: string;
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
      case "--additional-fields":
        parsed.additionalFields = parseInt(value);
        i++;
        break;
      case "--total-words":
        parsed.totalWords = parseInt(value);
        i++;
        break;
      case "--desc-length":
        parsed.descLength = parseInt(value);
        i++;
        break;
      case "--chart-name":
        parsed.chartName = value;
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
🎯 Enhanced Elasticsearch Benchmark Campaign CLI

Usage: npm run campaign:cli -- [options]

Required Options:
  --variable <type>       Variable to vary (numberOfBatches, documentsPerBatch, additionalFields, totalWords, descriptionWordLength, indexType)
  --min <number>          Minimum value for the variable
  --max <number>          Maximum value for the variable
  --increment <number>    Increment step for the variable
  --repetitions <number>  Number of times to repeat each configuration

Optional Configuration:
  --index-type <type>     Base index type (standard, ngram, stemming) [default: standard]
  --batches <number>      Base number of batches [default: 10]
  --docs-per-batch <num>  Base documents per batch [default: 100]

Product Structure Options:
  --additional-fields <n> Number of additional fields beyond 'name' [default: 1, creates 'description']
  --total-words <number>  Total words to distribute across fields [default: 10]

Legacy Options (for backward compatibility):
  --desc-length <number>  Description length (creates single 'description' field) [DEPRECATED]

Other Options:
  --chart-name <name>     Custom chart name for grouping results [default: auto-generated]
  --verbose               Enable verbose logging [default: false]
  --help, -h              Show this help message

Product Structure Examples:

  Legacy mode (--desc-length 100):
  • Creates: { name: "...", description: "100 words" }

  Default new mode (no field params):
  • Creates: { name: "...", description: "10 words" }

  Multiple fields (--additional-fields 3 --total-words 100):
  • Creates: { name: "...", field1: "~33 words", field2: "~33 words", field3: "~34 words" }

Examples:
  # Test field count impact
  npm run campaign:cli -- --variable additionalFields --min 1 --max 10 --increment 3 --repetitions 2 --total-words 100

  # Test total words scaling
  npm run campaign:cli -- --variable totalWords --min 10 --max 1000 --increment 200 --repetitions 3 --additional-fields 5

  # Test description word length scaling
  npm run campaign:cli -- --variable descriptionWordLength --min 10 --max 100 --increment 20 --repetitions 2

  # Test batch size scaling with custom field structure
  npm run campaign:cli -- --variable documentsPerBatch --min 100 --max 1000 --increment 300 --repetitions 3 --additional-fields 3 --total-words 50
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
      "descriptionWordLength",
      "additionalFields",
      "totalWords",
      "indexType",
      "numberOfUpdateBatches",
      "documentsPerUpdateBatch",
      "fuzziness",
    ].includes(args.variable)
  ) {
    errors.push(
      "--variable must be one of: numberOfBatches, documentsPerBatch, descriptionWordLength, additionalFields, totalWords, indexType, numberOfUpdateBatches, documentsPerUpdateBatch, fuzziness"
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

  if (args.additionalFields !== undefined && args.additionalFields < 0) {
    errors.push("--additional-fields must be >= 0");
  }

  if (args.totalWords !== undefined && args.totalWords < 1) {
    errors.push("--total-words must be >= 1");
  }

  if (args.additionalFields !== undefined && args.totalWords !== undefined) {
    if (args.additionalFields > args.totalWords) {
      errors.push(
        `--additional-fields (${args.additionalFields}) cannot be greater than --total-words (${args.totalWords})`
      );
    }
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

  console.log("🎯 Starting Enhanced Campaign from CLI...\n");

  try {
    const finalChartName = args.chartName || generateChartName(args.variable);

    if (args.descLength !== undefined) {
      console.log(
        "⚠️  Using legacy --desc-length parameter. Consider migrating to --additional-fields and --total-words"
      );
    }

    const baseConfig = createBaseConfig({
      indexName: `cli-campaign-${args.variable}`,
      indexType: args.indexType,
      batches: args.batches,
      docsPerBatch: args.docsPerBatch,
      additionalFields: args.additionalFields,
      totalWords: args.totalWords,
      descWordLength: args.descLength,
      chartName: finalChartName,
      verbose: args.verbose,
    });

    if (args.verbose && baseConfig.productStructure) {
      logProductStructure(baseConfig.productStructure, true);
    }

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
    console.log(`\t- Chart Name: "${finalChartName}"`);
    if (args.variable !== "indexType") {
      console.log(
        `\t- Range: ${args.min} to ${args.max} (increment: ${args.increment})`
      );
    } else {
      console.log(`\t- Values: standard, ngram, stemming`);
    }
    console.log(`\t- Repetitions: ${args.repetitions}`);
    console.log(
      `\t- Base config: ${baseConfig.numberOfBatches} batches × ${baseConfig.documentsPerBatch} docs`
    );

    if (baseConfig.productStructure) {
      const totalWords = baseConfig.productStructure.reduce(
        (sum, field) => sum + field.wordCount,
        0
      );
      const additionalFields = baseConfig.productStructure.filter(
        (field) => field.name !== "name"
      ).length;
      console.log(
        `\t- Product structure: ${additionalFields} additional fields, ${totalWords} total words`
      );
    } else {
      console.log(`\t- Product structure: legacy mode`);
    }

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
    console.log(`📊 Chart Name: "${finalChartName}"`);
  } catch (error) {
    console.error("❌ CLI Campaign failed:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  runCLI();
}
