import { Client } from "@elastic/elasticsearch";
import { Product } from "../../types";

export interface BulkOperationResult {
  took: number;
  errors: boolean;
  items: any[];
}

export const bulkIndex = async (
  client: Client,
  indexName: string,
  products: Product[]
): Promise<BulkOperationResult> => {
  const startTime = Date.now();

  try {
    const body = products.flatMap((product) => [
      { index: { _index: indexName, _id: product.id } },
      product,
    ]);

    const response = await client.bulk({ body });

    const result: BulkOperationResult = {
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
