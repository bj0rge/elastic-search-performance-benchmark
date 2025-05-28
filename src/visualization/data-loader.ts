// written with the help of AI
import fs from "fs-extra";
import path from "path";
import { BenchmarkResult } from "../types";
import { RESULTS_DIR } from "../persistence/persistence";
import { ChartData } from "./chart-generator";

export const loadAllBenchmarkResults = async (): Promise<BenchmarkResult[]> => {
  const files = await fs.readdir(RESULTS_DIR);
  const jsonFiles = files.filter(
    (file) => file.endsWith(".json") && file.startsWith("benchmark_")
  );

  const results: BenchmarkResult[] = [];

  for (const file of jsonFiles) {
    try {
      const filePath = path.join(RESULTS_DIR, file);
      const data = await fs.readJson(filePath);
      results.push(data);
    } catch (error) {
      console.warn(`Failed to load ${file}:`, error);
    }
  }

  return results;
};

export const groupResultsByChartName = (
  results: BenchmarkResult[]
): Map<string, BenchmarkResult[]> => {
  const groups = new Map<string, BenchmarkResult[]>();

  for (const result of results) {
    const chartName = result.config.chartName || "Unnamed Chart";

    if (!groups.has(chartName)) {
      groups.set(chartName, []);
    }

    groups.get(chartName)!.push(result);
  }

  return groups;
};

export const loadChartData = async (): Promise<ChartData[]> => {
  const allResults = await loadAllBenchmarkResults();
  const groupedResults = groupResultsByChartName(allResults);

  const chartDataArray: ChartData[] = [];

  for (const [chartName, results] of groupedResults) {
    chartDataArray.push({
      chartName,
      results,
    });
  }

  return chartDataArray;
};

export const getAvailableChartNames = async (): Promise<string[]> => {
  const allResults = await loadAllBenchmarkResults();
  const chartNames = new Set<string>();

  for (const result of allResults) {
    const chartName = result.config.chartName || "Unnamed Chart";
    chartNames.add(chartName);
  }

  return Array.from(chartNames).sort();
};

export const loadChartDataByName = async (
  chartName: string
): Promise<ChartData | null> => {
  const allResults = await loadAllBenchmarkResults();
  const matchingResults = allResults.filter(
    (result) => (result.config.chartName || "Unnamed Chart") === chartName
  );

  if (matchingResults.length === 0) {
    return null;
  }

  return {
    chartName,
    results: matchingResults,
  };
};
