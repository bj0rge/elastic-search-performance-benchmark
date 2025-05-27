import type { Client } from "@elastic/elasticsearch";
import type { BenchmarkConfig, Product } from "../../types";

export type BenchmarkContext = {
  client: Client;
  dataGenerator: {
    generateProducts: (count: number, descriptionLength: number) => Product[];
    generateProductUpdates: (
      count: number,
      descriptionLength: number
    ) => Array<{ id: string; updates: Partial<Product> }>;
  };
  indexedProducts: Product[];
  startTime: number;
  config: BenchmarkConfig;
};
