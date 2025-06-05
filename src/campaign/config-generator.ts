import type { BenchmarkConfig, IndexType } from "../types";
import type { VariationParams, VariableType } from "./types";
import {
  generateProductStructure,
  validateProductStructureConfig,
} from "../generator/product-structure";
import { getSearchableFields } from "../config/dynamic-index-configs";

const generateNumericValues = (
  min: number,
  max: number,
  increment: number
): number[] => {
  const values: number[] = [];
  for (let value = min; value <= max; value += increment) {
    values.push(value);
  }
  return values;
};

const generateIndexTypeValues = (): IndexType[] => {
  return ["standard", "ngram", "stemming"];
};

const applyVariationToConfig = (
  baseConfig: BenchmarkConfig,
  variable: VariableType,
  value: number | string
): BenchmarkConfig => {
  const config = { ...baseConfig };

  switch (variable) {
    case "numberOfBatches":
      config.numberOfBatches = value as number;
      break;

    case "documentsPerBatch":
      config.documentsPerBatch = value as number;
      break;

    case "descriptionWordLength":
      const newLegacyStructure = generateProductStructure({
        additionalFields: 1,
        totalWords: value as number,
      });
      config.productStructure = newLegacyStructure;

      const legacySearchableFields = getSearchableFields(
        config.productStructure
      );
      config.searchQueries.fullTextSearch.fields = legacySearchableFields;
      config.searchQueries.fuzzySearch.field =
        legacySearchableFields[0] || "name";
      break;

    case "additionalFields":
      const currentTotalWords = config.productStructure
        ? config.productStructure.reduce(
            (sum, field) => sum + field.wordCount,
            0
          )
        : 10;

      const newStructureConfig = {
        additionalFields: value as number,
        totalWords: currentTotalWords,
      };

      validateProductStructureConfig(newStructureConfig);
      config.productStructure = generateProductStructure(newStructureConfig);

      const newSearchableFields = getSearchableFields(config.productStructure);
      config.searchQueries.fullTextSearch.fields = newSearchableFields;
      config.searchQueries.fuzzySearch.field = newSearchableFields[0] || "name";
      break;

    case "totalWords":
      const currentAdditionalFields = config.productStructure
        ? config.productStructure.filter((field) => field.name !== "name")
            .length
        : 1;

      const newWordStructureConfig = {
        additionalFields: currentAdditionalFields,
        totalWords: value as number,
      };

      validateProductStructureConfig(newWordStructureConfig);
      config.productStructure = generateProductStructure(
        newWordStructureConfig
      );
      break;

    case "indexType":
      config.indexType = value as IndexType;
      break;

    case "numberOfUpdateBatches":
      config.updateConfig = {
        ...config.updateConfig,
        numberOfUpdateBatches: value as number,
      };
      break;

    case "documentsPerUpdateBatch":
      config.updateConfig = {
        ...config.updateConfig,
        documentsPerUpdateBatch: value as number,
      };
      break;

    case "fuzziness":
      config.searchQueries = {
        ...config.searchQueries,
        fuzzySearch: {
          ...config.searchQueries.fuzzySearch,
          fuzziness: value as string | number,
        },
      };
      break;

    default:
      throw new Error(`Unsupported variable type: ${variable}`);
  }

  const suffix = typeof value === "string" ? value : value.toString();
  config.indexName = `${baseConfig.indexName}-${variable}-${suffix}`;

  return config;
};

export const generateConfigurations = (
  baseConfig: BenchmarkConfig,
  variations: VariationParams
): BenchmarkConfig[] => {
  const { variable, min, max, increment, values } = variations;

  let variationValues: (number | string)[];

  if (values) {
    variationValues = values;
  } else if (variable === "indexType") {
    variationValues = generateIndexTypeValues();
  } else {
    variationValues = generateNumericValues(min, max, increment);
  }

  return variationValues.map((value) =>
    applyVariationToConfig(baseConfig, variable, value)
  );
};
