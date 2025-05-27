import { Client } from "@elastic/elasticsearch";

export {
  createIndex,
  deleteIndex,
  refreshIndex,
  getIndexStats,
} from "./index-management";
export type { ElasticIndexConfig } from "./index-management";
export { search, fuzzySearch, fullTextSearch } from "./search";
export type { SearchResult } from "./search";
export {
  bulkIndex,
  bulkUpdateDocuments,
  countDocuments,
} from "./bulk-operations";
export type { BulkIndexResult, BulkUpdateResult } from "./bulk-operations";

export const createElasticsearchClient = (
  host: string = "http://localhost:9200"
): Client => {
  return new Client({ node: host });
};

export const healthCheck = async (client: Client): Promise<boolean> => {
  try {
    const response = await client.ping();
    return response === true;
  } catch (error) {
    console.error("Elasticsearch health check failed:", error);
    return false;
  }
};
