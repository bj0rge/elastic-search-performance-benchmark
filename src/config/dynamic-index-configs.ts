import type { ElasticIndexConfig } from "../sdk/elasticsearch";
import { FieldDefinition } from "../generator/product-structure";

// Constants
const NUMBER_OF_SHARDS = 1;
const NUMBER_OF_REPLICAS = 0;

// Analyzers
const STANDARD_ANALYZER = "standard_analyzer";
const NGRAM_ANALYZER = "ngram_analyzer";
const STEMMING_ANALYZER = "stemming_analyzer";

// Tokenizer
const NGRAM_TOKENIZER = "ngram_tokenizer";

// N-gram settings
const NGRAM_MIN_GRAM = 2;
const NGRAM_MAX_GRAM = 3;

// Field types
const TYPE_KEYWORD = "keyword";
const TYPE_TEXT = "text";
const TYPE_DATE = "date";

const createDynamicMappings = (
  productStructure: FieldDefinition[],
  analyzer: string
) => {
  const properties: Record<string, any> = {
    id: { type: TYPE_KEYWORD },
    createdAt: { type: TYPE_DATE },
  };

  productStructure.forEach((field) => {
    if (field.name === "name") {
      properties[field.name] = {
        type: TYPE_TEXT,
        analyzer: analyzer,
      };
    } else if (field.wordCount > 0) {
      properties[field.name] = {
        type: TYPE_TEXT,
        analyzer: analyzer,
      };
    }
  });

  return { properties };
};

export const createDynamicStandardIndexConfig = (
  indexName: string,
  productStructure: FieldDefinition[]
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
  mappings: createDynamicMappings(productStructure, STANDARD_ANALYZER),
});

export const createDynamicNGramIndexConfig = (
  indexName: string,
  productStructure: FieldDefinition[]
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
  mappings: createDynamicMappings(productStructure, NGRAM_ANALYZER),
});

export const createDynamicStemmingIndexConfig = (
  indexName: string,
  productStructure: FieldDefinition[]
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
  mappings: createDynamicMappings(productStructure, STEMMING_ANALYZER),
});

export const createDynamicIndexConfig = (
  indexName: string,
  indexType: string,
  productStructure: FieldDefinition[]
): ElasticIndexConfig => {
  switch (indexType) {
    case "standard":
      return createDynamicStandardIndexConfig(indexName, productStructure);
    case "ngram":
      return createDynamicNGramIndexConfig(indexName, productStructure);
    case "stemming":
      return createDynamicStemmingIndexConfig(indexName, productStructure);
    default:
      throw new Error(`Unknown index type: ${indexType}`);
  }
};

export const getSearchableFields = (
  productStructure: FieldDefinition[]
): string[] => {
  return productStructure
    .filter((field) => field.name !== "name" && field.wordCount > 0)
    .map((field) => field.name)
    .concat(["name"]);
};

export const logIndexConfiguration = (
  indexName: string,
  indexType: string,
  productStructure: FieldDefinition[],
  verbose: boolean = true
): void => {
  if (!verbose) return;

  console.log(`🔧 Index Configuration: ${indexName}`);
  console.log(`  - Type: ${indexType}`);
  console.log(`  - Fields mapped:`);

  productStructure.forEach((field) => {
    if (field.name === "name") {
      console.log(`    • ${field.name}: text (${indexType} analyzer)`);
    } else if (field.wordCount > 0) {
      console.log(
        `    • ${field.name}: text (${indexType} analyzer, ${field.wordCount} words)`
      );
    }
  });

  console.log(`    • id: keyword`);
  console.log(`    • createdAt: date`);

  const searchableFields = getSearchableFields(productStructure);
  console.log(`  📊 Searchable fields: [${searchableFields.join(", ")}]`);
};
