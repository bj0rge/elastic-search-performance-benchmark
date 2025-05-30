import { faker } from "@faker-js/faker";
import { Product } from "../types";
import * as fs from "fs";

const UPDATE_NAME_PROBABILITY = 0.3;

type Corpus = string[];
export type DataGenerator = {
  generateProduct: (descriptionLength: number) => Product;
  generateProducts: (count: number, descriptionLength: number) => Product[];
  generateProductUpdate: (descriptionLength: number) => Partial<Product>;
  generateProductUpdates: (
    count: number,
    descriptionLength: number
  ) => Partial<Product>[];
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

const generateDescription = (corpus: Corpus, lineCount: number): string => {
  if (corpus.length === 0) {
    throw new Error("No corpus loaded");
  }

  const selectedLines: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    const randomIndex = Math.floor(Math.random() * corpus.length);
    selectedLines.push(corpus[randomIndex]);
  }

  return selectedLines.join("\n");
};

const generateProduct = (
  corpus: Corpus,
  descriptionLength: number = 1
): Product => {
  return {
    id: crypto.randomUUID(),
    name: faker.commerce.productName(),
    description: generateDescription(corpus, descriptionLength),
    createdAt: new Date(),
  };
};

const generateProductUpdate = (
  corpus: Corpus,
  descriptionLength: number = 1
): Partial<Product> => {
  const update: Partial<Product> = {
    description: generateDescription(corpus, descriptionLength),
  };

  if (Math.random() < UPDATE_NAME_PROBABILITY) {
    update.name = faker.commerce.productName();
  }

  return update;
};

export const createDataGenerator = (corpusFilePath: string): DataGenerator => {
  const corpus =
    corpusFilePath && fs.existsSync(corpusFilePath)
      ? loadCorpus(corpusFilePath)
      : [];

  return {
    generateProduct: (descriptionLength: number = 1) =>
      generateProduct(corpus, descriptionLength),

    generateProducts: (count: number, descriptionLength: number = 1) =>
      Array.from({ length: count }, () =>
        generateProduct(corpus, descriptionLength)
      ),

    generateProductUpdate: (descriptionLength: number = 1) =>
      generateProductUpdate(corpus, descriptionLength),

    generateProductUpdates: (count: number, descriptionLength: number = 1) =>
      Array.from({ length: count }, () =>
        generateProductUpdate(corpus, descriptionLength)
      ),
  };
};
