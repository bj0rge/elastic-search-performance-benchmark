// written with the help of AI
import { StreamProcessor } from "./stream-processor";
import { RESULTS_DIR } from "../persistence/persistence";
import { ChartData } from "./chart-generator";

export const loadChartData = async (): Promise<ChartData[]> => {
  const processor = new StreamProcessor({
    maxParallel: 6,
    enableCache: true,
    verbose: true,
  });

  const aggregations = await processor.processAllResults(RESULTS_DIR);

  const chartDataArray: ChartData[] = [];

  for (const [chartName, aggregation] of aggregations) {
    const dataPoints = Array.from(aggregation.dataPoints.values()).map(
      (dp) => ({
        variable: dp.variable,
        stats: {
          indexing: StreamProcessor.calculateStats(dp.indexingTimeMs),
          search: StreamProcessor.calculateStats(dp.searchTimeMs),
          update: StreamProcessor.calculateStats(dp.updateTimeMs),
          total: StreamProcessor.calculateStats(dp.totalDurationMs),
        },
      })
    );

    // Ajouter les données brutes pour les nuages de points
    const rawDataPoints = Array.from(aggregation.dataPoints.values()).map(
      (dp) => ({
        variable: dp.variable,
        rawValues: {
          indexing: dp.indexingTimeMs,
          search: dp.searchTimeMs,
          update: dp.updateTimeMs,
          total: dp.totalDurationMs,
        },
      })
    );

    console.log(`📊 Loaded chart: "${chartName}"`);
    console.log(`   Variable: ${aggregation.variable}`);
    console.log(`   Data points: ${dataPoints.length}`);
    console.log(`   Sample data point:`, dataPoints[0]?.variable);
    console.log(`   Sample stats:`, {
      indexing: dataPoints[0]?.stats.indexing.mean,
      search: dataPoints[0]?.stats.search.mean,
      update: dataPoints[0]?.stats.update.mean,
    });

    chartDataArray.push({
      chartName,
      variable: aggregation.variable,
      dataPoints,
      rawDataPoints,
    });
  }

  return chartDataArray;
};

export const getAvailableChartNames = async (): Promise<string[]> => {
  const processor = new StreamProcessor({ verbose: false });
  const aggregations = await processor.processAllResults(RESULTS_DIR);
  return Array.from(aggregations.keys()).sort();
};

export const loadChartDataByName = async (
  chartName: string
): Promise<ChartData | null> => {
  const processor = new StreamProcessor({ verbose: false });
  const aggregations = await processor.processAllResults(RESULTS_DIR);

  const aggregation = aggregations.get(chartName);
  if (!aggregation) {
    console.warn(`❌ No aggregation found for chart: "${chartName}"`);
    console.log(
      `Available charts: ${Array.from(aggregations.keys()).join(", ")}`
    );
    return null;
  }

  const dataPoints = Array.from(aggregation.dataPoints.values()).map((dp) => ({
    variable: dp.variable,
    stats: {
      indexing: StreamProcessor.calculateStats(dp.indexingTimeMs),
      search: StreamProcessor.calculateStats(dp.searchTimeMs),
      update: StreamProcessor.calculateStats(dp.updateTimeMs),
      total: StreamProcessor.calculateStats(dp.totalDurationMs),
    },
  }));

  const rawDataPoints = Array.from(aggregation.dataPoints.values()).map(
    (dp) => ({
      variable: dp.variable,
      rawValues: {
        indexing: dp.indexingTimeMs,
        search: dp.searchTimeMs,
        update: dp.updateTimeMs,
        total: dp.totalDurationMs,
      },
    })
  );

  console.log(`📊 Loaded specific chart: "${chartName}"`);
  console.log(`   Variable: ${aggregation.variable}`);
  console.log(`   Data points: ${dataPoints.length}`);

  // Debug pour identifier le problème
  if (dataPoints.length === 0) {
    console.error(`❌ No data points found for "${chartName}"`);
    console.log(`Aggregation structure:`, Object.keys(aggregation));
    console.log(`DataPoints map size:`, aggregation.dataPoints.size);
  } else {
    console.log(
      `   Variables: [${dataPoints.map((dp) => dp.variable).join(", ")}]`
    );
    console.log(`   Sample raw data sizes:`, {
      indexing: rawDataPoints[0]?.rawValues.indexing.length,
      search: rawDataPoints[0]?.rawValues.search.length,
      update: rawDataPoints[0]?.rawValues.update.length,
    });
  }

  return {
    chartName,
    variable: aggregation.variable,
    dataPoints,
    rawDataPoints,
  };
};
