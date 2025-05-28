// written with the help of AI
import {
  loadChartData,
  getAvailableChartNames,
  loadChartDataByName,
} from "../visualization/data-loader";
import {
  generateAllCharts,
  generateChart,
  ChartOptions,
} from "../visualization/chart-generator";

type CLIArgs = {
  chartName?: string;
  type?: "indexing" | "search" | "update" | "all";
  width?: number;
  height?: number;
  list?: boolean;
  help?: boolean;
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
      case "--type":
        parsed.type = value as "indexing" | "search" | "update" | "all";
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
      case "--list":
        parsed.list = true;
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
📊 Chart Generation CLI

Usage: npm run chart:generate -- [options]

Options:
  --chart-name <name>    Generate charts for specific chart name only
  --type <type>          Chart type: indexing, search, update, all [default: all]
  --width <number>       Chart width in pixels [default: 800]
  --height <number>      Chart height in pixels [default: 600]
  --list                 List available chart names and exit
  --help, -h             Show this help message

Examples:
  # Generate all charts for all chart names
  npm run chart:generate

  # List available chart names
  npm run chart:generate -- --list

  # Generate only search charts for a specific chart name
  npm run chart:generate -- --chart-name "Batch Size Scaling" --type search

  # Generate all charts with custom dimensions
  npm run chart:generate -- --width 1200 --height 800

Available chart types:
  - indexing: Total indexing time and average time per document
  - search: Full-text search and fuzzy search response times
  - update: Update time and reindexing time
  - all: Generate all three types (default)
`);
};

const listAvailableCharts = async () => {
  console.log("📊 Available Chart Names:\n");

  try {
    const chartNames = await getAvailableChartNames();

    if (chartNames.length === 0) {
      console.log("No benchmark results found in data/results/");
      console.log("Run some benchmarks first using the campaign CLI.");
      return;
    }

    chartNames.forEach((name, index) => {
      console.log(`${index + 1}. "${name}"`);
    });

    console.log(`\nTotal: ${chartNames.length} chart name(s)`);
  } catch (error) {
    console.error("❌ Failed to list chart names:", error);
  }
};

const generateChartsForData = async (
  chartData: any,
  type: "indexing" | "search" | "update" | "all",
  options: ChartOptions
) => {
  console.log(`📊 Generating charts for: "${chartData.chartName}"`);
  console.log(`📊 Results found: ${chartData.results.length}`);

  if (chartData.results.length === 0) {
    console.warn(
      `⚠️  No results found for chart name: "${chartData.chartName}"`
    );
    return;
  }

  try {
    if (type === "all") {
      const paths = await generateAllCharts(chartData, options);
      console.log(`✅ Generated ${paths.length} charts:`);
      paths.forEach((path) => console.log(`   - ${path}`));
    } else {
      const path = await generateChart(chartData, type, options);
      console.log(`✅ Generated chart: ${path}`);
    }
  } catch (error) {
    console.error(
      `❌ Failed to generate charts for "${chartData.chartName}":`,
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
    width: args.width || 800,
    height: args.height || 600,
  };

  const chartType = args.type || "all";

  console.log("📊 Starting chart generation...\n");

  try {
    if (args.chartName) {
      // Generate charts for specific chart name
      const chartData = await loadChartDataByName(args.chartName);

      if (!chartData) {
        console.error(
          `❌ No results found for chart name: "${args.chartName}"`
        );
        console.log("\nAvailable chart names:");
        const available = await getAvailableChartNames();
        available.forEach((name) => console.log(`  - "${name}"`));
        return;
      }

      await generateChartsForData(chartData, chartType, chartOptions);
    } else {
      // Generate charts for all chart names
      const allChartData = await loadChartData();

      if (allChartData.length === 0) {
        console.log("No benchmark results found in data/results/");
        console.log("Run some benchmarks first using the campaign CLI.");
        return;
      }

      console.log(`Found ${allChartData.length} chart name(s)\n`);

      for (const chartData of allChartData) {
        await generateChartsForData(chartData, chartType, chartOptions);
        console.log(""); // Empty line between chart groups
      }
    }

    console.log("🎉 Chart generation completed!");
    console.log("📁 Charts saved to: data/results/charts/");
  } catch (error) {
    console.error("❌ Chart generation failed:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  runCLI();
}
