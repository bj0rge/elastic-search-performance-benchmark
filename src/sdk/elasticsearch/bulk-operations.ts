import { Client } from "@elastic/elasticsearch";
import { Product } from "../../types";

export interface BulkIndexResult {
  took: number;
  errors: boolean;
  items: any[];
}

export type BulkUpdateResult = {
  took: number;
  errors: boolean;
  updated: number;
  failed: number;
};

export const bulkIndex = async (
  client: Client,
  indexName: string,
  products: Product[]
): Promise<BulkIndexResult> => {
  const startTime = Date.now();

  try {
    const body = products.flatMap((product) => [
      { index: { _index: indexName, _id: product.id } },
      product,
    ]);

    const response = await client.bulk({ body });

    const result: BulkIndexResult = {
      took: Date.now() - startTime,
      errors: response.errors,
      items: response.items,
    };

    if (result.errors) {
      const errorItems = result.items.filter((item) => item.index?.error);
      console.warn(`Bulk indexing had ${errorItems.length} errors`);
    }

    return result;
  } catch (error) {
    console.error("Bulk indexing failed:", error);
    throw error;
  }
};

export const bulkUpdateDocuments = async (
  client: Client,
  indexName: string,
  updates: Array<{ id: string; updates: Partial<Product> }>
): Promise<BulkUpdateResult> => {
  const startTime = Date.now();

  try {
    const body = updates.flatMap((update) => [
      { update: { _index: indexName, _id: update.id } },
      { doc: update.updates },
    ]);

    const response = await client.bulk({
      body,
      refresh: false, // Refresh will be manually controlled after the update
    });

    const updated = response.items.filter(
      (item) =>
        item.update?.result === "updated" || item.update?.result === "noop"
    ).length;

    const failed = response.items.filter((item) => item.update?.error).length;

    const result: BulkUpdateResult = {
      took: Date.now() - startTime,
      errors: response.errors,
      updated,
      failed,
    };

    if (result.errors) {
      console.warn(
        `Bulk update had ${failed} errors out of ${updates.length} updates`
      );
    }

    return result;
  } catch (error) {
    console.error("Bulk update failed:", error);
    throw error;
  }
};

export const countDocuments = async (
  client: Client,
  indexName: string
): Promise<number> => {
  try {
    const response = await client.count({ index: indexName });
    return response.count;
  } catch (error) {
    console.error(`Failed to count documents in index ${indexName}:`, error);
    throw error;
  }
};
