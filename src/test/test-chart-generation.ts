// written with the help of AI
import { runCampaign } from "../campaign";
import {
  createBaseConfig,
  createCampaignConfig,
} from "../campaign/config-factory";
import { createBenchmarkRunner } from "../campaign";
import { loadChartData, generateAllCharts } from "../visualization";

const generateSampleData = async () => {
  console.log("🧪 Generating sample benchmark data for chart testing...\n");

  // Create a small campaign to generate test data
  const baseConfig = createBaseConfig({
    indexName: "chart-test",
    indexType: "standard",
    batches: 5,
    docsPerBatch: 50,
    descLength: 1,
    chartName: "Test Chart - Document Scaling",
    verbose: false,
  });

  const campaignConfig = createCampaignConfig(
    baseConfig,
    "documentsPerBatch",
    50,
    200,
    50,
    1 // Only 1 repetition to keep it fast
  );

  const benchmarkRunner = createBenchmarkRunner({
    verbose: false,
    cleanup: {
      deleteIndexBefore: true,
      deleteIndexAfter: true,
    },
  });

  await runCampaign(campaignConfig, benchmarkRunner, { verbose: false });
  console.log("✅ Sample data generated\n");
};

const testChartGeneration = async () => {
  console.log("🧪 Testing chart generation...\n");

  try {
    // First, ensure we have some data
    await generateSampleData();

    // Load the chart data
    console.log("📊 Loading chart data...");
    const chartDataArray = await loadChartData();

    if (chartDataArray.length === 0) {
      console.error(
        "❌ No chart data found. Make sure benchmark results exist."
      );
      return;
    }

    console.log(`✅ Found ${chartDataArray.length} chart group(s)`);

    // Generate charts for each group
    for (const chartData of chartDataArray) {
      console.log(`\n📊 Generating charts for: "${chartData.chartName}"`);
      console.log(`📊 Results count: ${chartData.results.length}`);

      const chartPaths = await generateAllCharts(chartData, {
        width: 800,
        height: 600,
      });

      console.log(`✅ Generated ${chartPaths.length} charts:`);
      chartPaths.forEach((path) => console.log(`   - ${path}`));
    }

    console.log("\n🎉 Chart generation test completed successfully!");
    console.log("📁 Check the charts in: data/results/charts/");
  } catch (error) {
    console.error("❌ Chart generation test failed:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  testChartGeneration();
}
