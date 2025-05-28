// written with the help of AI
import type { ChartConfiguration } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "fs-extra";
import path from "path";
import { BenchmarkResult } from "../types";
import { RESULTS_DIR } from "../persistence/persistence";

export type ChartData = {
  chartName: string;
  results: BenchmarkResult[];
};

export type ChartOptions = {
  width?: number;
  height?: number;
  outputFormat?: "png" | "svg";
};

const CHARTS_DIR = path.join(RESULTS_DIR, "charts");

// Ensure charts directory exists
fs.ensureDirSync(CHARTS_DIR);

const createChartRenderer = (width: number = 800, height: number = 600) => {
  return new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
  });
};

const extractVariableValue = (result: BenchmarkResult): number | string => {
  const config = result.config;

  // Try to determine the variable from the index name pattern
  const indexName = config.indexName;

  if (indexName.includes("documentsPerBatch")) {
    return config.documentsPerBatch;
  } else if (indexName.includes("numberOfBatches")) {
    return config.numberOfBatches;
  } else if (indexName.includes("descriptionLength")) {
    return config.descriptionLength;
  } else if (indexName.includes("indexType")) {
    return config.indexType;
  }

  // Default to total documents as x-axis
  return config.numberOfBatches * config.documentsPerBatch;
};

const createIndexingTimeChart = (chartData: ChartData): ChartConfiguration => {
  // Group results by variable value and calculate averages
  const groupedData = new Map<
    string,
    {
      totalIndexingTimes: number[];
      avgPerDocTimes: number[];
    }
  >();

  for (const result of chartData.results) {
    const variableValue = extractVariableValue(result).toString();

    if (!groupedData.has(variableValue)) {
      groupedData.set(variableValue, {
        totalIndexingTimes: [],
        avgPerDocTimes: [],
      });
    }

    const group = groupedData.get(variableValue)!;
    group.totalIndexingTimes.push(result.indexingMetrics.totalIndexingTimeMs);
    group.avgPerDocTimes.push(result.indexingMetrics.averageTimePerDocumentMs);
  }

  // Calculate averages and sort by variable value
  const aggregatedData: Array<{
    label: string;
    sortKey: number | string;
    avgTotalTime: number;
    avgPerDoc: number;
  }> = [];

  for (const [variableValue, group] of groupedData) {
    const avgTotalTime =
      group.totalIndexingTimes.reduce((sum, val) => sum + val, 0) /
      group.totalIndexingTimes.length;
    const avgPerDoc =
      group.avgPerDocTimes.reduce((sum, val) => sum + val, 0) /
      group.avgPerDocTimes.length;

    // Determine sort key (numeric if possible, string otherwise)
    let sortKey: number | string = variableValue;
    const numericValue = parseFloat(variableValue);
    if (!isNaN(numericValue)) {
      sortKey = numericValue;
    }

    aggregatedData.push({
      label: variableValue,
      sortKey,
      avgTotalTime,
      avgPerDoc,
    });
  }

  // Sort by the sort key
  aggregatedData.sort((a, b) => {
    if (typeof a.sortKey === "number" && typeof b.sortKey === "number") {
      return a.sortKey - b.sortKey;
    }
    return String(a.sortKey).localeCompare(String(b.sortKey));
  });

  const labels = aggregatedData.map((item) => item.label);
  const indexingTimes = aggregatedData.map((item) =>
    Math.round(item.avgTotalTime)
  );
  const avgPerDoc = aggregatedData.map((item) =>
    parseFloat(item.avgPerDoc.toFixed(3))
  );

  // Create individual point datasets for scatter
  const scatterDatasets: any[] = [];

  for (const result of chartData.results) {
    const variableValue = extractVariableValue(result).toString();
    const labelIndex = labels.indexOf(variableValue);

    if (labelIndex !== -1) {
      // Create scatter point for total indexing time
      const totalTimeScatterData = new Array(labels.length).fill(null);
      totalTimeScatterData[labelIndex] =
        result.indexingMetrics.totalIndexingTimeMs;

      scatterDatasets.push({
        data: totalTimeScatterData,
        borderColor: "rgba(75, 192, 192, 0.6)",
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        yAxisID: "y",
        type: "scatter",
        pointRadius: 3,
        pointHoverRadius: 5,
        showLine: false,
        legendStyle: false, // Don't show in legend
      });

      // Create scatter point for avg per doc time
      const avgPerDocScatterData = new Array(labels.length).fill(null);
      avgPerDocScatterData[labelIndex] = parseFloat(
        result.indexingMetrics.averageTimePerDocumentMs.toFixed(3)
      );

      scatterDatasets.push({
        data: avgPerDocScatterData,
        borderColor: "rgba(255, 99, 132, 0.6)",
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        yAxisID: "y1",
        type: "scatter",
        pointRadius: 3,
        pointHoverRadius: 5,
        showLine: false,
        legendStyle: false, // Don't show in legend
      });
    }
  }

  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total Indexing Time (ms) - Average",
          data: indexingTimes,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          yAxisID: "y",
          type: "line",
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
        },
        {
          label: "Avg Time per Document (ms) - Average",
          data: avgPerDoc,
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          yAxisID: "y1",
          type: "line",
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
        },
        {
          label: "Total Indexing Time (ms) - Individual Points",
          data: [], // Just for legend
          borderColor: "rgba(75, 192, 192, 0.6)",
          backgroundColor: "rgba(75, 192, 192, 0.6)",
          yAxisID: "y",
          type: "scatter",
          pointRadius: 3,
          pointHoverRadius: 5,
          showLine: false,
        },
        {
          label: "Avg Time per Document (ms) - Individual Points",
          data: [], // Just for legend
          borderColor: "rgba(255, 99, 132, 0.6)",
          backgroundColor: "rgba(255, 99, 132, 0.6)",
          yAxisID: "y1",
          type: "scatter",
          pointRadius: 3,
          pointHoverRadius: 5,
          showLine: false,
        },
        ...scatterDatasets,
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${chartData.chartName} - Indexing Performance`,
        },
        legend: {
          display: true,
          position: "top",
          labels: {
            filter: (legendItem: any) => {
              // Only show items that don't have legendStyle: false
              return legendItem.legendStyle !== false;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Variable Value",
          },
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: "Total Time (ms)",
          },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: {
            display: true,
            text: "Avg Time per Doc (ms)",
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  };
};

const createSearchTimeChart = (chartData: ChartData): ChartConfiguration => {
  // Group results by variable value and calculate averages
  const groupedData = new Map<
    string,
    {
      fullTextTimes: number[];
      fuzzyTimes: number[];
    }
  >();

  for (const result of chartData.results) {
    const variableValue = extractVariableValue(result).toString();

    if (!groupedData.has(variableValue)) {
      groupedData.set(variableValue, {
        fullTextTimes: [],
        fuzzyTimes: [],
      });
    }

    const group = groupedData.get(variableValue)!;
    group.fullTextTimes.push(result.searchMetrics.averageFullTextSearchTimeMs);
    group.fuzzyTimes.push(result.searchMetrics.averageFuzzySearchTimeMs);
  }

  // Calculate averages and sort by variable value
  const aggregatedData: Array<{
    label: string;
    sortKey: number | string;
    avgFullText: number;
    avgFuzzy: number;
  }> = [];

  for (const [variableValue, group] of groupedData) {
    const avgFullText =
      group.fullTextTimes.reduce((sum, val) => sum + val, 0) /
      group.fullTextTimes.length;
    const avgFuzzy =
      group.fuzzyTimes.reduce((sum, val) => sum + val, 0) /
      group.fuzzyTimes.length;

    // Determine sort key (numeric if possible, string otherwise)
    let sortKey: number | string = variableValue;
    const numericValue = parseFloat(variableValue);
    if (!isNaN(numericValue)) {
      sortKey = numericValue;
    }

    aggregatedData.push({
      label: variableValue,
      sortKey,
      avgFullText,
      avgFuzzy,
    });
  }

  // Sort by the sort key
  aggregatedData.sort((a, b) => {
    if (typeof a.sortKey === "number" && typeof b.sortKey === "number") {
      return a.sortKey - b.sortKey;
    }
    return String(a.sortKey).localeCompare(String(b.sortKey));
  });

  const labels = aggregatedData.map((item) => item.label);
  const fullTextTimes = aggregatedData.map((item) =>
    parseFloat(item.avgFullText.toFixed(2))
  );
  const fuzzyTimes = aggregatedData.map((item) =>
    parseFloat(item.avgFuzzy.toFixed(2))
  );

  // Create individual point datasets for scatter
  const scatterDatasets: any[] = [];

  for (const result of chartData.results) {
    const variableValue = extractVariableValue(result).toString();
    const labelIndex = labels.indexOf(variableValue);

    if (labelIndex !== -1) {
      // Create scatter point for full-text search time
      const fullTextScatterData = new Array(labels.length).fill(null);
      fullTextScatterData[labelIndex] = parseFloat(
        result.searchMetrics.averageFullTextSearchTimeMs.toFixed(2)
      );

      scatterDatasets.push({
        data: fullTextScatterData,
        borderColor: "rgba(54, 162, 235, 0.6)",
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        type: "scatter",
        pointRadius: 3,
        pointHoverRadius: 5,
        showLine: false,
        legendStyle: false,
      });

      // Create scatter point for fuzzy search time
      const fuzzyScatterData = new Array(labels.length).fill(null);
      fuzzyScatterData[labelIndex] = parseFloat(
        result.searchMetrics.averageFuzzySearchTimeMs.toFixed(2)
      );

      scatterDatasets.push({
        data: fuzzyScatterData,
        borderColor: "rgba(255, 206, 86, 0.6)",
        backgroundColor: "rgba(255, 206, 86, 0.6)",
        type: "scatter",
        pointRadius: 3,
        pointHoverRadius: 5,
        showLine: false,
        legendStyle: false,
      });
    }
  }

  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Full-Text Search (ms) - Average",
          data: fullTextTimes,
          borderColor: "rgb(54, 162, 235)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          type: "line",
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
        },
        {
          label: "Fuzzy Search (ms) - Average",
          data: fuzzyTimes,
          borderColor: "rgb(255, 206, 86)",
          backgroundColor: "rgba(255, 206, 86, 0.2)",
          type: "line",
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
        },
        {
          label: "Full-Text Search (ms) - Individual Points",
          data: [], // Just for legend
          borderColor: "rgba(54, 162, 235, 0.6)",
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          type: "scatter",
          pointRadius: 3,
          pointHoverRadius: 5,
          showLine: false,
        },
        {
          label: "Fuzzy Search (ms) - Individual Points",
          data: [], // Just for legend
          borderColor: "rgba(255, 206, 86, 0.6)",
          backgroundColor: "rgba(255, 206, 86, 0.6)",
          type: "scatter",
          pointRadius: 3,
          pointHoverRadius: 5,
          showLine: false,
        },
        ...scatterDatasets,
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${chartData.chartName} - Search Performance`,
        },
        legend: {
          display: true,
          position: "top",
          labels: {
            filter: (legendItem: any) => {
              // Only show items that don't have legendStyle: false
              return legendItem.legendStyle !== false;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Variable Value",
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Response Time (ms)",
          },
        },
      },
    },
  };
};

const createUpdateTimeChart = (chartData: ChartData): ChartConfiguration => {
  // Group results by variable value and calculate averages
  const groupedData = new Map<
    string,
    {
      updateTimes: number[];
      reindexTimes: number[];
    }
  >();

  for (const result of chartData.results) {
    const variableValue = extractVariableValue(result).toString();

    if (!groupedData.has(variableValue)) {
      groupedData.set(variableValue, {
        updateTimes: [],
        reindexTimes: [],
      });
    }

    const group = groupedData.get(variableValue)!;
    group.updateTimes.push(result.updateMetrics.totalUpdateTimeMs);
    group.reindexTimes.push(result.updateMetrics.reindexingTimeMs);
  }

  // Calculate averages and sort by variable value
  const aggregatedData: Array<{
    label: string;
    sortKey: number | string;
    avgUpdate: number;
    avgReindex: number;
  }> = [];

  for (const [variableValue, group] of groupedData) {
    const avgUpdate =
      group.updateTimes.reduce((sum, val) => sum + val, 0) /
      group.updateTimes.length;
    const avgReindex =
      group.reindexTimes.reduce((sum, val) => sum + val, 0) /
      group.reindexTimes.length;

    // Determine sort key (numeric if possible, string otherwise)
    let sortKey: number | string = variableValue;
    const numericValue = parseFloat(variableValue);
    if (!isNaN(numericValue)) {
      sortKey = numericValue;
    }

    aggregatedData.push({
      label: variableValue,
      sortKey,
      avgUpdate,
      avgReindex,
    });
  }

  // Sort by the sort key
  aggregatedData.sort((a, b) => {
    if (typeof a.sortKey === "number" && typeof b.sortKey === "number") {
      return a.sortKey - b.sortKey;
    }
    return String(a.sortKey).localeCompare(String(b.sortKey));
  });

  const labels = aggregatedData.map((item) => item.label);
  const updateTimes = aggregatedData.map((item) => Math.round(item.avgUpdate));
  const reindexTimes = aggregatedData.map((item) =>
    Math.round(item.avgReindex)
  );

  // Create individual point datasets for scatter
  const scatterDatasets: any[] = [];

  for (const result of chartData.results) {
    const variableValue = extractVariableValue(result).toString();
    const labelIndex = labels.indexOf(variableValue);

    if (labelIndex !== -1) {
      // Create scatter point for update time
      const updateScatterData = new Array(labels.length).fill(null);
      updateScatterData[labelIndex] = result.updateMetrics.totalUpdateTimeMs;

      scatterDatasets.push({
        data: updateScatterData,
        borderColor: "rgba(153, 102, 255, 0.6)",
        backgroundColor: "rgba(153, 102, 255, 0.6)",
        type: "scatter",
        pointRadius: 3,
        pointHoverRadius: 5,
        showLine: false,
        legendStyle: false,
      });

      // Create scatter point for reindex time
      const reindexScatterData = new Array(labels.length).fill(null);
      reindexScatterData[labelIndex] = result.updateMetrics.reindexingTimeMs;

      scatterDatasets.push({
        data: reindexScatterData,
        borderColor: "rgba(255, 159, 64, 0.6)",
        backgroundColor: "rgba(255, 159, 64, 0.6)",
        type: "scatter",
        pointRadius: 3,
        pointHoverRadius: 5,
        showLine: false,
        legendStyle: false,
      });
    }
  }

  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Update Time (ms) - Average",
          data: updateTimes,
          borderColor: "rgb(153, 102, 255)",
          backgroundColor: "rgba(153, 102, 255, 0.2)",
          type: "line",
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
        },
        {
          label: "Reindexing Time (ms) - Average",
          data: reindexTimes,
          borderColor: "rgb(255, 159, 64)",
          backgroundColor: "rgba(255, 159, 64, 0.2)",
          type: "line",
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3,
        },
        {
          label: "Update Time (ms) - Individual Points",
          data: [], // Just for legend
          borderColor: "rgba(153, 102, 255, 0.6)",
          backgroundColor: "rgba(153, 102, 255, 0.6)",
          type: "scatter",
          pointRadius: 3,
          pointHoverRadius: 5,
          showLine: false,
        },
        {
          label: "Reindexing Time (ms) - Individual Points",
          data: [], // Just for legend
          borderColor: "rgba(255, 159, 64, 0.6)",
          backgroundColor: "rgba(255, 159, 64, 0.6)",
          type: "scatter",
          pointRadius: 3,
          pointHoverRadius: 5,
          showLine: false,
        },
        ...scatterDatasets,
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${chartData.chartName} - Update Performance`,
        },
        legend: {
          display: true,
          position: "top",
          labels: {
            filter: (legendItem: any) => {
              return legendItem.legendStyle !== false;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Variable Value",
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Time (ms)",
          },
        },
      },
    },
  };
};

export const generateChart = async (
  chartData: ChartData,
  chartType: "indexing" | "search" | "update",
  options: ChartOptions = {}
): Promise<string> => {
  const { width = 800, height = 600 } = options;
  const renderer = createChartRenderer(width, height);

  let config: ChartConfiguration;
  let filename: string;

  switch (chartType) {
    case "indexing":
      config = createIndexingTimeChart(chartData);
      filename = `${chartData.chartName.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_indexing.png`;
      break;
    case "search":
      config = createSearchTimeChart(chartData);
      filename = `${chartData.chartName.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_search.png`;
      break;
    case "update":
      config = createUpdateTimeChart(chartData);
      filename = `${chartData.chartName.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_update.png`;
      break;
  }

  const buffer = await renderer.renderToBuffer(config);
  const filePath = path.join(CHARTS_DIR, filename);

  await fs.writeFile(filePath, buffer);
  console.log(`📊 Chart saved: ${filePath}`);

  return filePath;
};

export const generateAllCharts = async (
  chartData: ChartData,
  options: ChartOptions = {}
): Promise<string[]> => {
  const paths = await Promise.all([
    generateChart(chartData, "indexing", options),
    generateChart(chartData, "search", options),
    generateChart(chartData, "update", options),
  ]);

  return paths;
};
