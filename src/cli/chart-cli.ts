// written with the help of AI
import {
  loadChartData,
  getAvailableChartNames,
  loadChartDataByName,
} from "../visualization/data-loader";
import { generateChart, ChartOptions } from "../visualization/chart-generator";

type CLIArgs = {
  chartName?: string;
  width?: number;
  height?: number;
  list?: boolean;
  help?: boolean;
  maxParallel?: number;
  noCache?: boolean;
  debug?: boolean;
};

const parseArgs = (): CLIArgs => {
  const args = process.argv.slice(2);
  const parsed: Partial<CLIArgs> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case "--chart-name":
        parsed.chartName = value;
        i++;
        break;
      case "--width":
        parsed.width = parseInt(value);
        i++;
        break;
      case "--height":
        parsed.height = parseInt(value);
        i++;
        break;
      case "--max-parallel":
        parsed.maxParallel = parseInt(value);
        i++;
        break;
      case "--list":
        parsed.list = true;
        break;
      case "--no-cache":
        parsed.noCache = true;
        break;
      case "--debug":
        parsed.debug = true;
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
📊 Unified Performance Chart Generator

Usage: npm run chart:generate -- [options]

Options:
  --chart-name <name>     Generate chart for specific dataset only
  --width <number>        Chart width in pixels [default: 1400]
  --height <number>       Chart height in pixels [default: 900]
  --max-parallel <number> Max parallel file processing [default: 6]
  --list                  List available chart names and exit
  --no-cache              Disable cache (force reprocessing)
  --debug                 Show detailed debug information
  --help, -h              Show this help message

Features:
  ✅ Unified charts (indexing + search + update on same graph)
  ✅ Mean lines with individual data points (scatter plots)
  ✅ Optimized for large datasets (95GB+ tested)
  ✅ Intelligent caching for fast subsequent runs
  ✅ Stream processing with minimal memory usage

Examples:
  # Generate all charts
  npm run chart:generate

  # Generate chart for specific dataset
  npm run chart:generate -- --chart-name "Batch Size Scaling Performance"

  # Generate with custom dimensions and debug
  npm run chart:generate -- --width 1600 --height 1200 --debug

Chart Types Generated:
  📈 Single unified performance chart per dataset
  📊 Shows indexing, search, and update performance together
  🔴 Individual data points as scatter plots
  📍 Mean lines connecting average values
`);
};

const listAvailableCharts = async () => {
  console.log("📊 Available Chart Datasets:\n");

  try {
    const chartNames = await getAvailableChartNames();

    if (chartNames.length === 0) {
      console.log("❌ No benchmark results found in data/results/");
      console.log("💡 Run some benchmarks first using: npm run campaign:cli");
      return;
    }

    chartNames.forEach((name, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. "${name}"`);
    });

    console.log(`\n✅ Total: ${chartNames.length} chart dataset(s) available`);
    console.log("💡 Use --chart-name to generate a specific chart");
  } catch (error) {
    console.error("❌ Failed to list chart names:\n", error);
  }
};

const generateChartForData = async (
  chartData: any,
  options: ChartOptions,
  debug: boolean = false
) => {
  console.log(`\n📈 Generating unified chart for: "${chartData.chartName}"`);

  if (debug) {
    console.log(`🔍 Debug info:`);
    console.log(`   Variable: ${chartData.variable}`);
    console.log(`   Data points: ${chartData.dataPoints?.length || 0}`);
    console.log(`   Raw data points: ${chartData.rawDataPoints?.length || 0}`);

    if (chartData.dataPoints && chartData.dataPoints.length > 0) {
      const firstPoint = chartData.dataPoints[0];
      console.log(`   First data point:`, {
        variable: firstPoint.variable,
        indexingMean: firstPoint.stats?.indexing?.mean,
        searchMean: firstPoint.stats?.search?.mean,
        updateMean: firstPoint.stats?.update?.mean,
      });
    }

    if (chartData.rawDataPoints && chartData.rawDataPoints.length > 0) {
      const firstRaw = chartData.rawDataPoints[0];
      console.log(`   First raw data:`, {
        variable: firstRaw.variable,
        indexingSamples: firstRaw.rawValues?.indexing?.length,
        searchSamples: firstRaw.rawValues?.search?.length,
        updateSamples: firstRaw.rawValues?.update?.length,
      });
    }
  }

  if (!chartData.dataPoints || chartData.dataPoints.length === 0) {
    console.error(`❌ No data points found for: "${chartData.chartName}"`);
    return;
  }

  try {
    const path = await generateChart(chartData, options);
    console.log(`✅ Generated unified chart: ${path.split("/").pop()}`);
    return path;
  } catch (error) {
    console.error(
      `❌ Failed to generate chart for "${chartData.chartName}":\n`,
      error
    );
  }
};

const runCLI = async () => {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  if (args.list) {
    await listAvailableCharts();
    return;
  }

  const chartOptions: ChartOptions = {
    width: args.width || 1400,
    height: args.height || 900,
  };

  console.log("🚀 Starting unified chart generation...\n");

  if (args.debug) {
    console.log("🔍 Debug mode enabled");
  }

  try {
    if (args.chartName) {
      // Générer chart pour un dataset spécifique
      console.log(`📊 Loading data for: "${args.chartName}"`);
      const chartData = await loadChartDataByName(args.chartName);

      if (!chartData) {
        console.error(`❌ No data found for chart name: "${args.chartName}"`);
        console.log("\n💡 Available chart names:");
        const available = await getAvailableChartNames();
        available.slice(0, 10).forEach((name) => console.log(`   - "${name}"`));
        if (available.length > 10) {
          console.log(`   ... and ${available.length - 10} more`);
        }
        return;
      }

      await generateChartForData(chartData, chartOptions, args.debug);
    } else {
      // Générer charts pour tous les datasets
      console.log("📊 Loading all chart data...");
      const allChartData = await loadChartData();

      if (allChartData.length === 0) {
        console.log("❌ No benchmark results found in data/results/");
        console.log("💡 Run some benchmarks first using: npm run campaign:cli");
        return;
      }

      console.log(`✅ Loaded ${allChartData.length} chart dataset(s)`);

      for (let i = 0; i < allChartData.length; i++) {
        const chartData = allChartData[i];
        console.log(
          `\n[${i + 1}/${allChartData.length}] Processing: "${
            chartData.chartName
          }"`
        );

        await generateChartForData(chartData, chartOptions, args.debug);
      }
    }

    console.log("\n🎉 Chart generation completed!");
    console.log("📁 Charts saved to: data/results/charts/");

    // Afficher le nombre de fichiers générés
    const fs = require("fs-extra");
    const chartFiles = await fs.readdir("data/results/charts");
    const pngFiles = chartFiles.filter((f: string) => f.endsWith(".png"));
    console.log(`📊 Total charts generated: ${pngFiles.length}`);
  } catch (error) {
    console.error("❌ Chart generation failed\n", error);

    process.exit(1);
  }
};

if (require.main === module) {
  runCLI();
}
