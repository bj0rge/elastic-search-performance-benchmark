import { Client } from "@elastic/elasticsearch";
import { elasticSdk } from "../../sdk";
import type { BenchmarkContext } from "./benchmark-context";
import { buildLogger } from "../../utils";

export type SearchPhaseResult = {
  fullTextSearchResults: Array<{
    term: string;
    searchTimeMs: number;
    resultsCount: number;
    totalHits: number;
  }>;
  fuzzySearchResults: Array<{
    term: string;
    fuzziness: string | number;
    searchTimeMs: number;
    resultsCount: number;
    totalHits: number;
  }>;
};

const executeFullTextSearches = async ({
  client,
  indexName,
  terms,
  fields,
  verbose,
}: {
  client: Client;
  indexName: string;
  terms: string[];
  fields: string[];
  verbose: boolean;
}): Promise<SearchPhaseResult["fullTextSearchResults"]> => {
  const results: SearchPhaseResult["fullTextSearchResults"] = [];

  const logger = buildLogger(verbose);

  logger.log(`🔍 Executing full-text searches...`);
  for (const term of terms) {
    const searchStartTime = Date.now();

    logger.log(`\t🔍 Full-text search for: "${term}"`);

    const searchResult = await elasticSdk.fullTextSearch(
      client,
      indexName,
      fields,
      term
    );

    const searchTimeMs = Date.now() - searchStartTime;

    const result = {
      term,
      searchTimeMs,
      resultsCount: searchResult.hits.hits.length,
      totalHits: searchResult.hits.total,
    };

    results.push(result);

    logger.log(`\t\t✅ Found ${result.totalHits} results in ${searchTimeMs}ms`);
  }

  return results;
};

const executeFuzzySearches = async ({
  client,
  indexName,
  terms,
  field,
  fuzziness,
  verbose,
}: {
  client: Client;
  indexName: string;
  terms: string[];
  field: string;
  fuzziness: string | number;
  verbose: boolean;
}): Promise<SearchPhaseResult["fuzzySearchResults"]> => {
  const results: SearchPhaseResult["fuzzySearchResults"] = [];

  const logger = buildLogger(verbose);

  logger.log(`🔍 Executing fuzzy searches...`);
  for (const term of terms) {
    const searchStartTime = Date.now();

    logger.log(`\t🔍 Fuzzy search for: "${term}" (fuzziness: ${fuzziness})`);

    const searchResult = await elasticSdk.fuzzySearch(
      client,
      indexName,
      field,
      term,
      fuzziness
    );

    const searchTimeMs = Date.now() - searchStartTime;

    const result = {
      term,
      fuzziness,
      searchTimeMs,
      resultsCount: searchResult.hits.hits.length,
      totalHits: searchResult.hits.total,
    };

    results.push(result);

    logger.log(`\t\t✅ Found ${result.totalHits} results in ${searchTimeMs}ms`);
  }

  return results;
};

export const executeSearchPhase = async (
  context: BenchmarkContext
): Promise<SearchPhaseResult> => {
  const { client, config } = context;
  const { indexName, searchQueries, verbose } = config;

  const logger = buildLogger(verbose);

  logger.log(`🔄 Starting search phase...`);
  logger.log(
    `📊 Full-text search terms: ${searchQueries.fullTextSearch.terms.length}`
  );
  logger.log(
    `📊 Fuzzy search terms: ${searchQueries.fuzzySearch.terms.length}`
  );

  try {
    const fullTextSearchResults = await executeFullTextSearches({
      client,
      indexName,
      terms: searchQueries.fullTextSearch.terms,
      fields: searchQueries.fullTextSearch.fields,
      verbose,
    });

    const fuzzySearchResults = await executeFuzzySearches({
      client,
      indexName,
      terms: searchQueries.fuzzySearch.terms,
      field: searchQueries.fuzzySearch.field,
      fuzziness: searchQueries.fuzzySearch.fuzziness,
      verbose,
    });

    const avgFullTextTime =
      fullTextSearchResults.length > 0
        ? fullTextSearchResults.reduce((sum, r) => sum + r.searchTimeMs, 0) /
          fullTextSearchResults.length
        : 0;

    const avgFuzzyTime =
      fuzzySearchResults.length > 0
        ? fuzzySearchResults.reduce((sum, r) => sum + r.searchTimeMs, 0) /
          fuzzySearchResults.length
        : 0;

    const result: SearchPhaseResult = {
      fullTextSearchResults,
      fuzzySearchResults,
    };

    logger.log(`✅ Search phase completed:`);
    logger.log(
      `📊 Full-text searches: ${
        fullTextSearchResults.length
      } (avg: ${avgFullTextTime.toFixed(2)}ms)`
    );
    logger.log(
      `📊 Fuzzy searches: ${
        fuzzySearchResults.length
      } (avg: ${avgFuzzyTime.toFixed(2)}ms)`
    );

    return result;
  } catch (error) {
    logger.error(`❌ Search phase failed:`, error);
    throw new Error(
      `Search phase failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
