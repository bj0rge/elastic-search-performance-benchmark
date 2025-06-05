// written with the help of AI
import type { ChartConfiguration } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "fs-extra";
import path from "path";
import { RESULTS_DIR } from "../persistence/persistence";

export type ChartData = {
  chartName: string;
  variable: string;
  dataPoints: Array<{
    variable: string | number;
    stats: {
      indexing: {
        mean: number;
        median: number;
        min: number;
        max: number;
        std: number;
        count: number;
      };
      search: {
        mean: number;
        median: number;
        min: number;
        max: number;
        std: number;
        count: number;
      };
      update: {
        mean: number;
        median: number;
        min: number;
        max: number;
        std: number;
        count: number;
      };
      total: {
        mean: number;
        median: number;
        min: number;
        max: number;
        std: number;
        count: number;
      };
    };
  }>;
  rawDataPoints?: Array<{
    variable: string | number;
    rawValues: {
      indexing: number[];
      search: number[];
      update: number[];
      total: number[];
    };
  }>;
};

export type ChartOptions = {
  width?: number;
  height?: number;
  outputFormat?: "png" | "svg";
};

const CHARTS_DIR = path.join(RESULTS_DIR, "charts");

fs.ensureDirSync(CHARTS_DIR);

const createChartRenderer = (width: number = 1400, height: number = 900) => {
  return new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: "white",
  });
};

// Fonction pour ajouter du jitter (dispersion) horizontal
const addJitter = (
  baseX: number,
  index: number,
  total: number,
  maxJitter: number = 0.3
): number => {
  // Créer une dispersion uniforme autour de la position de base
  const spread = index / Math.max(1, total - 1) - 0.5; // -0.5 à +0.5
  return baseX + spread * maxJitter;
};

const createUnifiedPerformanceChart = (
  chartData: ChartData
): ChartConfiguration => {
  console.log(`🔧 DEBUG: Starting chart creation for "${chartData.chartName}"`);

  // Trier les points par variable
  const sortedDataPoints = chartData.dataPoints.sort((a, b) => {
    const aVal =
      typeof a.variable === "number"
        ? a.variable
        : parseFloat(a.variable as string) || 0;
    const bVal =
      typeof b.variable === "number"
        ? b.variable
        : parseFloat(b.variable as string) || 0;
    return aVal - bVal;
  });

  const labels = sortedDataPoints.map((dp) => dp.variable.toString());

  // Données pour les courbes de moyennes
  const indexingMeans = sortedDataPoints.map((dp) => dp.stats.indexing.mean);
  const searchMeans = sortedDataPoints.map((dp) => dp.stats.search.mean);
  const updateMeans = sortedDataPoints.map((dp) => dp.stats.update.mean);

  console.log(`📊 Chart data debug for "${chartData.chartName}":`);
  console.log(`   Variables: [${labels.join(", ")}]`);
  console.log(`   Indexing means: [${indexingMeans.join(", ")}]`);
  console.log(`   Search means: [${searchMeans.join(", ")}]`);
  console.log(`   Update means: [${updateMeans.join(", ")}]`);

  const datasets: any[] = [];

  // 1. Courbes des moyennes (lignes principales)
  datasets.push({
    label: "Indexing Time (ms) - Mean",
    data: indexingMeans,
    borderColor: "rgb(75, 192, 192)",
    backgroundColor: "rgba(75, 192, 192, 0.1)",
    borderWidth: 3,
    pointRadius: 8,
    pointHoverRadius: 10,
    type: "line",
    tension: 0.1,
    fill: false,
  });

  datasets.push({
    label: "Search Time (ms) - Mean",
    data: searchMeans,
    borderColor: "rgb(54, 162, 235)",
    backgroundColor: "rgba(54, 162, 235, 0.1)",
    borderWidth: 3,
    pointRadius: 8,
    pointHoverRadius: 10,
    type: "line",
    tension: 0.1,
    fill: false,
  });

  datasets.push({
    label: "Update Time (ms) - Mean",
    data: updateMeans,
    borderColor: "rgb(255, 99, 132)",
    backgroundColor: "rgba(255, 99, 132, 0.1)",
    borderWidth: 3,
    pointRadius: 8,
    pointHoverRadius: 10,
    type: "line",
    tension: 0.1,
    fill: false,
  });

  // 2. Nuages de points avec jitter horizontal
  if (chartData.rawDataPoints) {
    console.log(`🔧 DEBUG: Adding scatter points with horizontal jitter...`);

    // Créer des datasets consolidés pour chaque métrique avec jitter
    const allIndexingScatter: Array<{ x: number; y: number }> = [];
    const allSearchScatter: Array<{ x: number; y: number }> = [];
    const allUpdateScatter: Array<{ x: number; y: number }> = [];

    // Pour chaque variable, collecter tous les points avec jitter
    sortedDataPoints.forEach((dataPoint, labelIndex) => {
      const rawData = chartData.rawDataPoints!.find(
        (rd) => rd.variable === dataPoint.variable
      );

      if (rawData) {
        console.log(
          `🔧 DEBUG: Processing ${dataPoint.variable} with jitter at base position ${labelIndex}`
        );

        // Ajouter les points indexing avec jitter
        rawData.rawValues.indexing.forEach((value, pointIndex) => {
          const jitteredX = addJitter(
            labelIndex,
            pointIndex,
            rawData.rawValues.indexing.length,
            0.25
          );
          allIndexingScatter.push({
            x: jitteredX,
            y: value,
          });

          if (pointIndex < 3) {
            console.log(
              `🔧 DEBUG: Indexing point ${pointIndex}: x=${jitteredX.toFixed(
                3
              )}, y=${value}`
            );
          }
        });

        // Ajouter les points search avec jitter
        rawData.rawValues.search.forEach((value, pointIndex) => {
          const jitteredX = addJitter(
            labelIndex,
            pointIndex,
            rawData.rawValues.search.length,
            0.25
          );
          allSearchScatter.push({
            x: jitteredX,
            y: value,
          });

          if (pointIndex < 3) {
            console.log(
              `🔧 DEBUG: Search point ${pointIndex}: x=${jitteredX.toFixed(
                3
              )}, y=${value}`
            );
          }
        });

        // Ajouter les points update avec jitter
        rawData.rawValues.update.forEach((value, pointIndex) => {
          const jitteredX = addJitter(
            labelIndex,
            pointIndex,
            rawData.rawValues.update.length,
            0.25
          );
          allUpdateScatter.push({
            x: jitteredX,
            y: value,
          });

          if (pointIndex < 3) {
            console.log(
              `🔧 DEBUG: Update point ${pointIndex}: x=${jitteredX.toFixed(
                3
              )}, y=${value}`
            );
          }
        });
      }
    });

    console.log(`🔧 DEBUG: Total scatter points with jitter:`);
    console.log(`   - Indexing: ${allIndexingScatter.length} points`);
    console.log(`   - Search: ${allSearchScatter.length} points`);
    console.log(`   - Update: ${allUpdateScatter.length} points`);

    // Ajouter les datasets scatter avec jitter
    if (allIndexingScatter.length > 0) {
      datasets.push({
        label: "Indexing Individual Points",
        data: allIndexingScatter,
        borderColor: "rgba(75, 192, 192, 0.6)",
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        pointRadius: 3,
        pointHoverRadius: 5,
        type: "scatter",
        showLine: false,
        hidden: false,
      });
    }

    if (allSearchScatter.length > 0) {
      datasets.push({
        label: "Search Individual Points",
        data: allSearchScatter,
        borderColor: "rgba(54, 162, 235, 0.6)",
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        pointRadius: 3,
        pointHoverRadius: 5,
        type: "scatter",
        showLine: false,
        hidden: false,
      });
    }

    if (allUpdateScatter.length > 0) {
      datasets.push({
        label: "Update Individual Points",
        data: allUpdateScatter,
        borderColor: "rgba(255, 99, 132, 0.6)",
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        pointRadius: 3,
        pointHoverRadius: 5,
        type: "scatter",
        showLine: false,
        hidden: false,
      });
    }
  }

  console.log(`🔧 DEBUG: Final dataset count: ${datasets.length}`);

  return {
    type: "line",
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${chartData.chartName} - Performance Analysis`,
          font: { size: 18, weight: "bold" },
        },
        legend: {
          display: true,
          position: "top",
          labels: {
            // Filtrer pour ne montrer que les moyennes dans la légende
            filter: function (legendItem: any, chartData: any) {
              return legendItem.datasetIndex < 3; // Seulement les 3 moyennes
            },
          },
        },
        tooltip: {
          callbacks: {
            title: function (tooltipItems: any[]) {
              const item = tooltipItems[0];
              if (item.dataset.type === "scatter") {
                const labelIndex = Math.round(item.parsed.x);
                return `${getAxisLabel(chartData.variable)}: ${
                  labels[labelIndex] ||
                  labels[Math.max(0, Math.min(labels.length - 1, labelIndex))]
                }`;
              }
              return `${getAxisLabel(chartData.variable)}: ${item.label}`;
            },
            label: function (tooltipItem: any) {
              const datasetLabel = tooltipItem.dataset.label || "";
              const value = tooltipItem.parsed.y.toFixed(2);

              // Simplifier les noms pour les scatter points
              const cleanLabel = datasetLabel
                .replace(" Individual Points", "")
                .trim();
              return `${cleanLabel}: ${value} ms`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: getAxisLabel(chartData.variable),
            font: { size: 14, weight: "bold" },
          },
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.1)",
          },
          // Configuration pour supporter le jitter
          type: "linear",
          min: -0.5,
          max: labels.length - 0.5,
          ticks: {
            stepSize: 1,
            callback: function (value: any, index: number) {
              const intValue = Math.round(value);
              return labels[intValue] || "";
            },
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Time (milliseconds)",
            font: { size: 14, weight: "bold" },
          },
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.1)",
          },
          beginAtZero: true,
        },
      },
      interaction: {
        intersect: false,
        mode: "point",
      },
    },
  };
};

const getAxisLabel = (variable: string): string => {
  const labels: Record<string, string> = {
    documentsPerBatch: "Documents per Batch",
    numberOfBatches: "Number of Batches",
    descriptionWordLength: "Description Length (words)",
    indexType: "Index Type",
    numberOfUpdateBatches: "Number of Update Batches",
    documentsPerUpdateBatch: "Documents per Update Batch",
  };

  return labels[variable] || variable;
};

export const generateChart = async (
  chartData: ChartData,
  options: ChartOptions = {}
): Promise<string> => {
  const { width = 1400, height = 900 } = options;
  const renderer = createChartRenderer(width, height);

  console.log(`🎨 Generating unified chart for: "${chartData.chartName}"`);
  console.log(`📊 Data points available: ${chartData.dataPoints.length}`);

  const config = createUnifiedPerformanceChart(chartData);
  const filename = `${chartData.chartName.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}_performance.png`;

  const buffer = await renderer.renderToBuffer(config);
  const filePath = path.join(CHARTS_DIR, filename);

  await fs.writeFile(filePath, buffer);
  console.log(`📊 Chart saved: ${path.basename(filePath)}`);

  return filePath;
};

export const generateAllCharts = async (
  chartData: ChartData,
  options: ChartOptions = {}
): Promise<string[]> => {
  const path = await generateChart(chartData, options);
  return [path];
};
