// written with the help of AI
import * as fs from "fs-extra";
import * as path from "path";
import { BenchmarkResult } from "../types";

type DataPoint = {
  variable: string | number;
  indexingTimeMs: number[];
  searchTimeMs: number[];
  updateTimeMs: number[];
  totalDurationMs: number[];
  timestamps: string[];
};

type ChartAggregation = {
  chartName: string;
  variable: string;
  dataPoints: Map<string | number, DataPoint>;
};

type ProcessorOptions = {
  maxParallel?: number;
  enableCache?: boolean;
  cacheFile?: string;
  verbose?: boolean;
};

export class StreamProcessor {
  private aggregations = new Map<string, ChartAggregation>();
  private processedFiles = 0;
  private totalFiles = 0;
  private startTime = 0;
  private options: Required<ProcessorOptions>;

  constructor(options: ProcessorOptions = {}) {
    this.options = {
      maxParallel: options.maxParallel || 6,
      enableCache: options.enableCache ?? true,
      cacheFile:
        options.cacheFile ||
        path.join(__dirname, "../../data/cache/aggregations.json"),
      verbose: options.verbose ?? true,
    };
  }

  async processAllResults(
    resultsDir: string
  ): Promise<Map<string, ChartAggregation>> {
    this.startTime = Date.now();

    // Vérifier le cache
    if (this.options.enableCache && (await this.isCacheValid(resultsDir))) {
      return await this.loadFromCache();
    }

    // Stream processing
    const files = await this.getResultFiles(resultsDir);
    this.totalFiles = files.length;

    if (this.options.verbose) {
      console.log(
        `🔄 Processing ${this.totalFiles} files with stream processing...`
      );
      console.log(`⚙️  Parallel workers: ${this.options.maxParallel}`);
    }

    await this.processFilesInParallel(files);

    // Sauvegarder le cache
    if (this.options.enableCache) {
      await this.saveToCache(resultsDir);
    }

    const duration = Date.now() - this.startTime;
    if (this.options.verbose) {
      console.log(
        `✅ Stream processing completed in ${(duration / 1000).toFixed(2)}s`
      );
      console.log(`📊 Generated ${this.aggregations.size} chart datasets`);
    }

    return this.aggregations;
  }

  private async getResultFiles(resultsDir: string): Promise<string[]> {
    const files = await fs.readdir(resultsDir);
    return files
      .filter((file) => file.endsWith(".json") && file.startsWith("benchmark_"))
      .map((file) => path.join(resultsDir, file));
  }

  private async processFilesInParallel(files: string[]): Promise<void> {
    const chunks = this.chunkArray(files, this.options.maxParallel);

    for (const chunk of chunks) {
      const promises = chunk.map((file) => this.processFile(file));
      await Promise.all(promises);
    }
  }

  private async processFile(filePath: string): Promise<void> {
    try {
      const result: BenchmarkResult = await fs.readJson(filePath);
      const chartInfo = this.extractChartInfo(result);

      if (chartInfo) {
        this.updateAggregation(chartInfo, result);
      }

      this.processedFiles++;
      if (this.options.verbose && this.processedFiles % 50 === 0) {
        this.logProgress();
      }
    } catch (error) {
      if (this.options.verbose) {
        console.warn(`⚠️  Failed to process ${path.basename(filePath)}`);
      }
    }
  }

  private extractChartInfo(
    result: BenchmarkResult
  ): { chartName: string; variable: string; value: string | number } | null {
    const config = result.config;

    if (!config.chartName) return null;

    // Méthode améliorée d'extraction basée sur l'indexName et la config
    const indexName = config.indexName;

    // Déterminer la variable et sa valeur en fonction du pattern de l'indexName
    let variable: string;
    let value: string | number;

    if (indexName.includes("-indexType-")) {
      // Pattern: cli-campaign-indexType-standard
      variable = "indexType";
      value = config.indexType; // Utiliser directement la config
    } else if (indexName.includes("-documentsPerBatch-")) {
      // Pattern: cli-campaign-documentsPerBatch-1000
      variable = "documentsPerBatch";
      value = config.documentsPerBatch;
    } else if (indexName.includes("-numberOfBatches-")) {
      // Pattern: cli-campaign-numberOfBatches-50
      variable = "numberOfBatches";
      value = config.numberOfBatches;
    } else if (indexName.includes("-descriptionWordLength-")) {
      // Pattern: cli-campaign-descriptionWordLength-10
      variable = "descriptionWordLength";
      value = config.descriptionWordLength;
    } else if (indexName.includes("-numberOfUpdateBatches-")) {
      variable = "numberOfUpdateBatches";
      value = config.updateConfig.numberOfUpdateBatches;
    } else if (indexName.includes("-documentsPerUpdateBatch-")) {
      variable = "documentsPerUpdateBatch";
      value = config.updateConfig.documentsPerUpdateBatch;
    } else {
      // Fallback: essayer l'ancienne méthode
      const parts = indexName.split("-");
      if (parts.length < 4) return null;

      variable = parts[2];
      value = parts[3];

      if (!isNaN(Number(value))) {
        value = Number(value);
      }
    }

    // Debug pour vérifier l'extraction
    if (this.options.verbose && this.processedFiles < 5) {
      console.log(
        `🔍 Extracted: ${config.chartName} -> ${variable}=${value} (from ${indexName})`
      );
    }

    return { chartName: config.chartName, variable, value };
  }

  // FONCTION CORRIGÉE pour calculer la moyenne des search
  private calculateSearchAverage(result: BenchmarkResult): number {
    const searchMetrics = result.searchMetrics;

    // Si les moyennes sont déjà calculées, les utiliser
    if (
      searchMetrics.averageFullTextSearchTimeMs !== undefined &&
      searchMetrics.averageFuzzySearchTimeMs !== undefined
    ) {
      return (
        (searchMetrics.averageFullTextSearchTimeMs +
          searchMetrics.averageFuzzySearchTimeMs) /
        2
      );
    }

    // Sinon, calculer à partir des résultats bruts
    let totalSearchTime = 0;
    let totalSearchCount = 0;

    // Calculer moyenne des full-text searches
    if (
      searchMetrics.fullTextSearchResults &&
      searchMetrics.fullTextSearchResults.length > 0
    ) {
      const fullTextTotal = searchMetrics.fullTextSearchResults.reduce(
        (sum, result) => sum + result.searchTimeMs,
        0
      );
      totalSearchTime += fullTextTotal;
      totalSearchCount += searchMetrics.fullTextSearchResults.length;
    }

    // Calculer moyenne des fuzzy searches
    if (
      searchMetrics.fuzzySearchResults &&
      searchMetrics.fuzzySearchResults.length > 0
    ) {
      const fuzzyTotal = searchMetrics.fuzzySearchResults.reduce(
        (sum, result) => sum + result.searchTimeMs,
        0
      );
      totalSearchTime += fuzzyTotal;
      totalSearchCount += searchMetrics.fuzzySearchResults.length;
    }

    const average =
      totalSearchCount > 0 ? totalSearchTime / totalSearchCount : 0;

    // Debug pour voir les calculs
    if (this.options.verbose && this.processedFiles < 5) {
      console.log(
        `🔍 Search calc: fullTextResults=${
          searchMetrics.fullTextSearchResults?.length
        }, fuzzyResults=${
          searchMetrics.fuzzySearchResults?.length
        }, average=${average.toFixed(2)}ms`
      );
    }

    return average;
  }

  private updateAggregation(
    chartInfo: { chartName: string; variable: string; value: string | number },
    result: BenchmarkResult
  ): void {
    const { chartName, variable, value } = chartInfo;

    if (!this.aggregations.has(chartName)) {
      this.aggregations.set(chartName, {
        chartName,
        variable,
        dataPoints: new Map(),
      });
    }

    const aggregation = this.aggregations.get(chartName)!;

    if (!aggregation.dataPoints.has(value)) {
      aggregation.dataPoints.set(value, {
        variable: value,
        indexingTimeMs: [],
        searchTimeMs: [],
        updateTimeMs: [],
        totalDurationMs: [],
        timestamps: [],
      });
    }

    const dataPoint = aggregation.dataPoints.get(value)!;

    // CALCUL CORRIGÉ de la moyenne search
    const searchAverage = this.calculateSearchAverage(result);

    // Map-Reduce: ajouter les métriques
    dataPoint.indexingTimeMs.push(result.indexingMetrics.totalIndexingTimeMs);
    dataPoint.searchTimeMs.push(searchAverage); // Utiliser la moyenne calculée
    dataPoint.updateTimeMs.push(result.updateMetrics.totalUpdateTimeMs);
    dataPoint.totalDurationMs.push(result.totalTestDurationMs);
    dataPoint.timestamps.push(result.timestamp);
  }

  private async isCacheValid(resultsDir: string): Promise<boolean> {
    try {
      if (!(await fs.pathExists(this.options.cacheFile))) return false;

      const cacheData = await fs.readJson(this.options.cacheFile);
      const resultsStat = await fs.stat(resultsDir);

      return (
        new Date(cacheData.metadata.resultsLastModified) >= resultsStat.mtime
      );
    } catch {
      return false;
    }
  }

  private async loadFromCache(): Promise<Map<string, ChartAggregation>> {
    const cacheData = await fs.readJson(this.options.cacheFile);

    if (this.options.verbose) {
      console.log(
        `💾 Loading ${
          Object.keys(cacheData.aggregations).length
        } charts from cache...`
      );
    }

    const aggregations = new Map<string, ChartAggregation>();

    for (const [chartName, data] of Object.entries(cacheData.aggregations)) {
      const aggregation = data as any;
      aggregations.set(chartName, {
        chartName: aggregation.chartName,
        variable: aggregation.variable,
        dataPoints: new Map(Object.entries(aggregation.dataPoints)),
      });
    }

    return aggregations;
  }

  private async saveToCache(resultsDir: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.options.cacheFile));

      const resultsStat = await fs.stat(resultsDir);
      const aggregationsForCache: Record<string, any> = {};

      for (const [chartName, aggregation] of this.aggregations) {
        aggregationsForCache[chartName] = {
          chartName: aggregation.chartName,
          variable: aggregation.variable,
          dataPoints: Object.fromEntries(aggregation.dataPoints),
        };
      }

      const cacheData = {
        metadata: {
          resultsLastModified: resultsStat.mtime.toISOString(),
          createdAt: new Date().toISOString(),
          totalCharts: this.aggregations.size,
          totalFiles: this.totalFiles,
        },
        aggregations: aggregationsForCache,
      };

      await fs.writeJson(this.options.cacheFile, cacheData, { spaces: 2 });

      if (this.options.verbose) {
        console.log(
          `💾 Saved ${this.aggregations.size} chart datasets to cache`
        );
      }
    } catch (error) {
      if (this.options.verbose) {
        console.warn("⚠️  Failed to save cache");
      }
    }
  }

  private logProgress(): void {
    const elapsed = Date.now() - this.startTime;
    const rate = this.processedFiles / (elapsed / 1000);
    const remaining = Math.round(
      (this.totalFiles - this.processedFiles) / rate
    );
    const percentage = ((this.processedFiles / this.totalFiles) * 100).toFixed(
      1
    );

    console.log(
      `📊 Progress: ${percentage}% (${this.processedFiles}/${this.totalFiles}) ` +
        `| ${rate.toFixed(1)} files/s | ETA: ${this.formatTime(remaining)}`
    );
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor(
      (seconds % 3600) / 60
    )}m`;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  static calculateStats(values: number[]) {
    if (values.length === 0)
      return { mean: 0, median: 0, min: 0, max: 0, std: 0, count: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      values.length;
    const std = Math.sqrt(variance);

    return {
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      std: parseFloat(std.toFixed(2)),
      count: values.length,
    };
  }
}
