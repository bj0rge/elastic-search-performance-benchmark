import type { ElasticIndexConfig } from "../sdk/elasticsearch";

// Index
const NUMBER_OF_SHARDS = 1;
const NUMBER_OF_REPLICAS = 0;

// Analyzer
const STANDARD_ANALYZER = "standard_analyzer";
const NGRAM_ANALYZER = "ngram_analyzer";
const STEMMING_ANALYZER = "stemming_analyzer";

// Tokenizer
const NGRAM_TOKENIZER = "ngram_tokenizer";

// N-gram
const NGRAM_MIN_GRAM = 2;
const NGRAM_MAX_GRAM = 3;

// Field names
const FIELD_ID = "id";
const FIELD_NAME = "name";
const FIELD_DESCRIPTION = "description";
const FIELD_CREATED_AT = "createdAt";

// Field types
const TYPE_KEYWORD = "keyword";
const TYPE_TEXT = "text";
const TYPE_DATE = "date";

export const createStandardIndexConfig = (
  indexName: string
): ElasticIndexConfig => ({
  name: indexName,
  settings: {
    number_of_shards: NUMBER_OF_SHARDS,
    number_of_replicas: NUMBER_OF_REPLICAS,
    analysis: {
      analyzer: {
        [STANDARD_ANALYZER]: {
          type: "standard",
        },
      },
    },
  },
  mappings: {
    properties: {
      [FIELD_ID]: { type: TYPE_KEYWORD },
      [FIELD_NAME]: {
        type: TYPE_TEXT,
        analyzer: STANDARD_ANALYZER,
      },
      [FIELD_DESCRIPTION]: {
        type: TYPE_TEXT,
        analyzer: STANDARD_ANALYZER,
      },
      [FIELD_CREATED_AT]: { type: TYPE_DATE },
    },
  },
});

export const createNGramIndexConfig = (
  indexName: string
): ElasticIndexConfig => ({
  name: indexName,
  settings: {
    number_of_shards: NUMBER_OF_SHARDS,
    number_of_replicas: NUMBER_OF_REPLICAS,
    analysis: {
      analyzer: {
        [NGRAM_ANALYZER]: {
          type: "custom",
          tokenizer: NGRAM_TOKENIZER,
          filter: ["lowercase"],
        },
      },
      tokenizer: {
        [NGRAM_TOKENIZER]: {
          type: "ngram",
          min_gram: NGRAM_MIN_GRAM,
          max_gram: NGRAM_MAX_GRAM,
          token_chars: ["letter", "digit"],
        },
      },
    },
  },
  mappings: {
    properties: {
      [FIELD_ID]: { type: TYPE_KEYWORD },
      [FIELD_NAME]: {
        type: TYPE_TEXT,
        analyzer: NGRAM_ANALYZER,
      },
      [FIELD_DESCRIPTION]: {
        type: TYPE_TEXT,
        analyzer: NGRAM_ANALYZER,
      },
      [FIELD_CREATED_AT]: { type: TYPE_DATE },
    },
  },
});

export const createStemmingIndexConfig = (
  indexName: string
): ElasticIndexConfig => ({
  name: indexName,
  settings: {
    number_of_shards: NUMBER_OF_SHARDS,
    number_of_replicas: NUMBER_OF_REPLICAS,
    analysis: {
      analyzer: {
        [STEMMING_ANALYZER]: {
          type: "custom",
          tokenizer: "standard",
          filter: ["lowercase", "porter_stem"],
        },
      },
    },
  },
  mappings: {
    properties: {
      [FIELD_ID]: { type: TYPE_KEYWORD },
      [FIELD_NAME]: {
        type: TYPE_TEXT,
        analyzer: STEMMING_ANALYZER,
      },
      [FIELD_DESCRIPTION]: {
        type: TYPE_TEXT,
        analyzer: STEMMING_ANALYZER,
      },
      [FIELD_CREATED_AT]: { type: TYPE_DATE },
    },
  },
});
