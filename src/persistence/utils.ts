import path from "path";
import { BenchmarkResult } from "../types";
import { RESULTS_DIR } from "./persistence";
import * as fs from "fs-extra";

export const calculateTotalTimeFromBatches = <
  T extends { indexingTimeMs?: number; updateTimeMs?: number }
>(
  batches: T[],
  timeField: keyof T
): number => {
  return batches.reduce((sum, batch) => sum + (batch[timeField] as number), 0);
};

export const loadBenchmarkResults = async (
  filePath: string
): Promise<BenchmarkResult> => {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(RESULTS_DIR, filePath);
  return await fs.readJson(fullPath);
};

export const listBenchmarkResults = async (): Promise<string[]> => {
  const files = await fs.readdir(RESULTS_DIR);
  return files.filter(
    (file) => file.endsWith(".json") && file.startsWith("benchmark_")
  );
};
