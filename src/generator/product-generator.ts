import { faker } from "@faker-js/faker";
import { Product } from "../types";
import * as fs from "fs";
import { FieldDefinition } from "./product-structure";

const UPDATE_NAME_PROBABILITY = 0.3;

type Corpus = string[];

export type DataGenerator = {
  generateProduct: (productStructure: FieldDefinition[]) => Product;
  generateProducts: (
    count: number,
    productStructure: FieldDefinition[]
  ) => Product[];
  generateProductAsync: (
    productStructure: FieldDefinition[]
  ) => Promise<Product>;
  generateProductsAsync: (
    count: number,
    productStructure: FieldDefinition[]
  ) => Promise<Product[]>;
  generateProductsStream: (
    count: number,
    productStructure: FieldDefinition[]
  ) => AsyncGenerator<Product, void, unknown>;
  generateProductUpdate: (
    productStructure: FieldDefinition[]
  ) => Partial<Product>;
  generateProductUpdates: (
    count: number,
    productStructure: FieldDefinition[]
  ) => Partial<Product>[];

  generateProductLegacy: (descriptionWordLength: number) => Product;
  generateProductsLegacy: (
    count: number,
    descriptionWordLength: number
  ) => Product[];
  generateProductAsyncLegacy: (
    descriptionWordLength: number
  ) => Promise<Product>;
  generateProductsAsyncLegacy: (
    count: number,
    descriptionWordLength: number
  ) => Promise<Product[]>;
  generateProductsStreamLegacy: (
    count: number,
    descriptionWordLength: number
  ) => AsyncGenerator<Product, void, unknown>;
  generateProductUpdateLegacy: (
    descriptionWordLength: number
  ) => Partial<Product>;
  generateProductUpdatesLegacy: (
    count: number,
    descriptionWordLength: number
  ) => Partial<Product>[];

  corpus: Corpus;
};

const loadCorpus = (filePath: string): Corpus => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const corpus = content.split("\n").filter((line) => line.trim().length > 0);
    console.log(`Loaded ${corpus.length} lines from corpus`);
    return corpus;
  } catch (error) {
    console.error("Failed to load corpus:", error);
    return [];
  }
};

const generateDescription = (corpus: Corpus, wordCount: number): string => {
  if (wordCount === 0) return "";

  const chunks: string[] = [];
  let currentWordCount = 0;
  const chunkTargetSize = 5000;

  while (currentWordCount < wordCount) {
    const remainingWords = wordCount - currentWordCount;
    const targetWordsForChunk = Math.min(chunkTargetSize, remainingWords);

    const chunk = generateDescriptionChunk(corpus, targetWordsForChunk);
    chunks.push(chunk);

    const chunkWords = chunk.split(/\s+/).length;
    currentWordCount += chunkWords;
  }

  const result = chunks.join("\n");
  chunks.length = 0;
  return result;
};

const generateDescriptionChunk = (
  corpus: Corpus,
  wordCount: number
): string => {
  const selectedLines: string[] = [];
  let currentWordCount = 0;

  while (currentWordCount < wordCount) {
    const randomIndex = Math.floor(Math.random() * corpus.length);
    const line = corpus[randomIndex];
    const lineWords = line.split(/\s+/);

    if (currentWordCount + lineWords.length <= wordCount) {
      selectedLines.push(line);
      currentWordCount += lineWords.length;
    } else {
      const remainingWords = wordCount - currentWordCount;
      const truncatedLine = lineWords.slice(0, remainingWords).join(" ");
      selectedLines.push(truncatedLine);
      break;
    }
  }

  return selectedLines.join("\n");
};

const generateDescriptionAsync = async (
  corpus: Corpus,
  wordCount: number
): Promise<string> => {
  if (corpus.length === 0) {
    throw new Error("No corpus loaded");
  }

  if (wordCount > 50000) {
    return await generateDescriptionLargeAsync(corpus, wordCount);
  }

  return generateDescription(corpus, wordCount);
};

const generateDescriptionLargeAsync = async (
  corpus: Corpus,
  wordCount: number
): Promise<string> => {
  const chunks: string[] = [];
  let currentWordCount = 0;
  const chunkTargetSize = 5000;
  let chunkCount = 0;

  while (currentWordCount < wordCount) {
    const remainingWords = wordCount - currentWordCount;
    const targetWordsForChunk = Math.min(chunkTargetSize, remainingWords);

    const chunk = generateDescriptionChunk(corpus, targetWordsForChunk);
    chunks.push(chunk);

    const chunkWords = chunk.split(/\s+/).length;
    currentWordCount += chunkWords;
    chunkCount++;

    if (wordCount > 200000 && chunkCount % 100 === 0) {
      if (global.gc) {
        global.gc();
      }
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  const result = chunks.join("\n");
  chunks.length = 0;
  return result;
};

const generateProductFromStructure = (
  corpus: Corpus,
  productStructure: FieldDefinition[]
): Product => {
  const product: any = {
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  productStructure.forEach((field) => {
    if (field.name === "name") {
      product.name = faker.commerce.productName();
    } else {
      product[field.name] = generateDescription(corpus, field.wordCount);
    }
  });

  return product as Product;
};

const generateProductFromStructureAsync = async (
  corpus: Corpus,
  productStructure: FieldDefinition[]
): Promise<Product> => {
  const product: any = {
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  for (const field of productStructure) {
    if (field.name === "name") {
      product.name = faker.commerce.productName();
    } else {
      product[field.name] = await generateDescriptionAsync(
        corpus,
        field.wordCount
      );
    }
  }

  return product as Product;
};

const generateProductUpdate = (
  corpus: Corpus,
  productStructure: FieldDefinition[]
): Partial<Product> => {
  const update: any = {};

  productStructure.forEach((field) => {
    if (field.name === "name") {
      if (Math.random() < UPDATE_NAME_PROBABILITY) {
        update.name = faker.commerce.productName();
      }
    } else {
      update[field.name] = generateDescription(corpus, field.wordCount);
    }
  });

  return update;
};

async function* generateProductsStream({
  corpus,
  count,
  productStructure,
}: {
  corpus: Corpus;
  count: number;
  productStructure: FieldDefinition[];
}): AsyncGenerator<Product, void, unknown> {
  console.log(`🏭 Streaming generation of ${count} products...`);

  const fifteenPercent = Math.floor(count * 0.15);
  for (let i = 0; i < count; i++) {
    if (i % fifteenPercent === 0) {
      console.log(
        `📦 Progress: ${Math.floor(
          (i / count) * 100
        )}%, generated documents ${i}/${count}`
      );
    }

    const product = await generateProductFromStructureAsync(
      corpus,
      productStructure
    );
    yield product;

    const totalWords = productStructure.reduce(
      (sum, field) => sum + field.wordCount,
      0
    );
    if (totalWords > 100000) {
      if (global.gc) {
        global.gc();
      }
      if (totalWords > 500000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  console.log(`✅ Streaming generation completed for ${count} products`);
}

const generateProductsAsync = async ({
  corpus,
  count,
  productStructure,
}: {
  corpus: Corpus;
  count: number;
  productStructure: FieldDefinition[];
}): Promise<Product[]> => {
  const totalWords = productStructure.reduce(
    (sum, field) => sum + field.wordCount,
    0
  );

  if (totalWords > 50000 || count * totalWords > 500000) {
    console.log(
      `⚠️  Large generation detected. Consider using generateProductsStream instead for better memory management.`
    );
  }

  const products: Product[] = [];
  console.log(`🏭 Async generating ${count} products...`);

  for (let i = 0; i < count; i++) {
    const product = await generateProductFromStructureAsync(
      corpus,
      productStructure
    );
    products.push(product);

    if (count > 5 && (i + 1) % Math.max(1, Math.floor(count / 10)) === 0) {
      const progress = (((i + 1) / count) * 100).toFixed(1);
      const memUsage = process.memoryUsage();
      console.log(
        `📊 Progress: ${progress}% - Memory: ${Math.round(
          memUsage.heapUsed / 1024 / 1024
        )}MB`
      );
    }

    if (totalWords > 100000) {
      if (global.gc) {
        global.gc();
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  console.log(`✅ Async generation completed for ${count} products`);
  return products;
};

export const createDataGenerator = (corpusFilePath: string): DataGenerator => {
  const corpus =
    corpusFilePath && fs.existsSync(corpusFilePath)
      ? loadCorpus(corpusFilePath)
      : [];

  return {
    generateProduct: (productStructure: FieldDefinition[]) =>
      generateProductFromStructure(corpus, productStructure),

    generateProducts: (count: number, productStructure: FieldDefinition[]) =>
      Array.from({ length: count }, () =>
        generateProductFromStructure(corpus, productStructure)
      ),

    generateProductAsync: (productStructure: FieldDefinition[]) =>
      generateProductFromStructureAsync(corpus, productStructure),

    generateProductsAsync: (
      count: number,
      productStructure: FieldDefinition[]
    ) => generateProductsAsync({ corpus, count, productStructure }),

    generateProductsStream: (
      count: number,
      productStructure: FieldDefinition[]
    ) => generateProductsStream({ corpus, count, productStructure }),

    generateProductUpdate: (productStructure: FieldDefinition[]) =>
      generateProductUpdate(corpus, productStructure),

    generateProductUpdates: (
      count: number,
      productStructure: FieldDefinition[]
    ) =>
      Array.from({ length: count }, () =>
        generateProductUpdate(corpus, productStructure)
      ),

    generateProductLegacy: (descriptionWordLength: number = 1) => {
      const legacyStructure = [
        { name: "name", wordCount: 0 },
        { name: "description", wordCount: descriptionWordLength },
      ];
      return generateProductFromStructure(corpus, legacyStructure);
    },

    generateProductsLegacy: (
      count: number,
      descriptionWordLength: number = 1
    ) => {
      const legacyStructure = [
        { name: "name", wordCount: 0 },
        { name: "description", wordCount: descriptionWordLength },
      ];
      return Array.from({ length: count }, () =>
        generateProductFromStructure(corpus, legacyStructure)
      );
    },

    generateProductAsyncLegacy: (descriptionWordLength: number = 1) => {
      const legacyStructure = [
        { name: "name", wordCount: 0 },
        { name: "description", wordCount: descriptionWordLength },
      ];
      return generateProductFromStructureAsync(corpus, legacyStructure);
    },

    generateProductsAsyncLegacy: (
      count: number,
      descriptionWordLength: number = 1
    ) => {
      const legacyStructure = [
        { name: "name", wordCount: 0 },
        { name: "description", wordCount: descriptionWordLength },
      ];
      return generateProductsAsync({
        corpus,
        count,
        productStructure: legacyStructure,
      });
    },

    generateProductsStreamLegacy: (
      count: number,
      descriptionWordLength: number = 1
    ) => {
      const legacyStructure = [
        { name: "name", wordCount: 0 },
        { name: "description", wordCount: descriptionWordLength },
      ];
      return generateProductsStream({
        corpus,
        count,
        productStructure: legacyStructure,
      });
    },

    generateProductUpdateLegacy: (descriptionWordLength: number = 1) => {
      const legacyStructure = [
        { name: "name", wordCount: 0 },
        { name: "description", wordCount: descriptionWordLength },
      ];
      return generateProductUpdate(corpus, legacyStructure);
    },

    generateProductUpdatesLegacy: (
      count: number,
      descriptionWordLength: number = 1
    ) => {
      const legacyStructure = [
        { name: "name", wordCount: 0 },
        { name: "description", wordCount: descriptionWordLength },
      ];
      return Array.from({ length: count }, () =>
        generateProductUpdate(corpus, legacyStructure)
      );
    },

    corpus,
  };
};
