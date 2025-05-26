import { Client } from "@elastic/elasticsearch";

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
  try {
    const exists = await indexExists(client, config.name);

    if (exists) {
      console.log(`Index ${config.name} already exists`);
      return;
    }

    await client.indices.create({
      index: config.name,
      settings: config.settings,
      mappings: config.mappings,
    });

    console.log(`Index ${config.name} created successfully`);
  } catch (error) {
    console.error(`Failed to create index ${config.name}:`, error);
    throw error;
  }
};

export const deleteIndex = async (
  client: Client,
  indexName: string
): Promise<void> => {
  try {
    const exists = await indexExists(client, indexName);

    if (!exists) {
      console.log(`Index ${indexName} does not exist`);
      return;
    }

    await client.indices.delete({ index: indexName });
    console.log(`Index ${indexName} deleted successfully`);
  } catch (error) {
    console.error(`Failed to delete index ${indexName}:`, error);
    throw error;
  }
};

export const refreshIndex = async (
  client: Client,
  indexName: string
): Promise<void> => {
  try {
    await client.indices.refresh({ index: indexName });
  } catch (error) {
    console.error(`Failed to refresh index ${indexName}:`, error);
    throw error;
  }
};

export const getIndexStats = async (
  client: Client,
  indexName: string
): Promise<any> => {
  try {
    const response = await client.indices.stats({ index: indexName });
    return response;
  } catch (error) {
    console.error(`Failed to get stats for index ${indexName}:`, error);
    throw error;
  }
};
