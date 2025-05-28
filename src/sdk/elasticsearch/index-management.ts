import { Client } from "@elastic/elasticsearch";
import { sanitizeIndexName } from "./utils";

export type ElasticIndexSettings = {
  number_of_shards: number;
  number_of_replicas: number;
  analysis?: {
    analyzer?: Record<string, any>;
    tokenizer?: Record<string, any>;
    filter?: Record<string, any>;
  };
};

export type ElasticIndexMappings = {
  properties: Record<string, any>;
};

export type ElasticIndexConfig = {
  name: string;
  settings: ElasticIndexSettings;
  mappings: ElasticIndexMappings;
};

export const indexExists = async (
  client: Client,
  indexName: string
): Promise<boolean> => {
  return client.indices.exists({ index: indexName });
};

export const createIndex = async (
  client: Client,
  config: ElasticIndexConfig
): Promise<void> => {
  const sanitizedIndexName = sanitizeIndexName(config.name);
  try {
    const exists = await indexExists(client, sanitizedIndexName);

    if (exists) {
      console.log(`Index ${sanitizedIndexName} already exists`);
      return;
    }

    await client.indices.create({
      index: sanitizedIndexName,
      settings: config.settings,
      mappings: config.mappings,
    });

    console.log(`Index ${sanitizedIndexName} created successfully`);
  } catch (error) {
    console.error(`Failed to create index ${sanitizedIndexName}:`, error);
    throw error;
  }
};

export const deleteIndex = async (
  client: Client,
  indexName: string
): Promise<void> => {
  const sanitizedIndexName = sanitizeIndexName(indexName);
  try {
    const exists = await indexExists(client, sanitizedIndexName);

    if (!exists) {
      console.log(`Index ${sanitizedIndexName} does not exist`);
      return;
    }

    await client.indices.delete({ index: sanitizedIndexName });
    console.log(`Index ${sanitizedIndexName} deleted successfully`);
  } catch (error) {
    console.error(`Failed to delete index ${sanitizedIndexName}:`, error);
    throw error;
  }
};

export const refreshIndex = async (
  client: Client,
  indexName: string
): Promise<void> => {
  const sanitizedIndexName = sanitizeIndexName(indexName);
  try {
    await client.indices.refresh({ index: sanitizedIndexName });
  } catch (error) {
    console.error(`Failed to refresh index ${sanitizedIndexName}:`, error);
    throw error;
  }
};

export const getIndexStats = async (
  client: Client,
  indexName: string
): Promise<any> => {
  const sanitizedIndexName = sanitizeIndexName(indexName);
  try {
    const response = await client.indices.stats({ index: sanitizedIndexName });
    return response;
  } catch (error) {
    console.error(
      `Failed to get stats for index ${sanitizedIndexName}:`,
      error
    );
    throw error;
  }
};
