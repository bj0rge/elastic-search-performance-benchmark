import { Client } from "@elastic/elasticsearch";
import { Product } from "../../types";

type Hit<T> = {
  _index: string;
  _id: string;
  _score: number;
  _source: T;
};

export interface SearchResult<T> {
  took: number;
  hits: {
    total: number;
    hits: Array<Hit<T>>;
  };
}

const isHit = <T>(hit: any): hit is Hit<T> => {
  return (
    hit._id !== undefined && hit._score !== null && hit._score !== undefined
  );
};

export const search = async (
  client: Client,
  indexName: string,
  query: any,
  options: {
    size?: number;
    from?: number;
    sort?: any[];
  } = {}
): Promise<SearchResult<Product>> => {
  try {
    const response = await client.search({
      index: indexName,
      query,
      size: options.size || 10,
      from: options.from || 0,
      sort: options.sort,
    });

    return {
      took: response.took,
      hits: {
        total: response.hits.hits.length,
        hits: response.hits.hits.filter(isHit).map((hit) => ({
          _index: hit._index,
          _id: hit._id,
          _score: hit._score,
          _source: hit._source as Product,
        })),
      },
    };
  } catch (error) {
    console.error("Search failed:", error);
    throw error;
  }
};

export const fuzzySearch = async (
  client: Client,
  indexName: string,
  field: string,
  term: string,
  fuzziness: string | number = "AUTO",
  options: { size?: number; from?: number } = {}
): Promise<SearchResult<Product>> => {
  const query = {
    fuzzy: {
      [field]: {
        value: term,
        fuzziness: fuzziness,
      },
    },
  };

  return search(client, indexName, query, options);
};

export const fullTextSearch = async (
  client: Client,
  indexName: string,
  fields: string[],
  term: string,
  options: { size?: number; from?: number; operator?: "and" | "or" } = {}
): Promise<SearchResult<Product>> => {
  const query = {
    multi_match: {
      query: term,
      fields: fields,
      operator: options.operator || "or",
    },
  };

  return search(client, indexName, query, options);
};
