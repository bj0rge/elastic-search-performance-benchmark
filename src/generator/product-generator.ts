import { faker } from "@faker-js/faker";
import { Product } from "../types";
import * as fs from "fs";

const UPDATE_NAME_PROBABILITY = 0.3;

type Corpus = string[];

export type DataGenerator = {
  generateProduct: (descriptionWordLength: number) => Product;
  generateProducts: (count: number, descriptionWordLength: number) => Product[];
  generateProductAsync: (descriptionWordLength: number) => Promise<Product>;
  generateProductsAsync: (
    count: number,
    descriptionWordLength: number
  ) => Promise<Product[]>;
  generateProductsStream: (
    count: number,
    descriptionWordLength: number
  ) => AsyncGenerator<Product, void, unknown>;
  generateProductUpdate: (descriptionWordLength: number) => Partial<Product>;
  generateProductUpdates: (
    count: number,
    descriptionWordLength: number
  ) => Partial<Product>[];
  corpus: Corpus; // Exposer le corpus pour les phases qui en ont besoin
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
  // console.log(
  //   `📝 Generating large description with ${wordCount.toLocaleString()} words...`
  // );

  const chunks: string[] = [];
  let currentWordCount = 0;
  const chunkTargetSize = 5000; // Traiter par chunks de 5000 mots

  while (currentWordCount < wordCount) {
    const remainingWords = wordCount - currentWordCount;
    const targetWordsForChunk = Math.min(chunkTargetSize, remainingWords);

    const chunk = generateDescriptionChunk(corpus, targetWordsForChunk);
    chunks.push(chunk);

    // Compter les mots réels dans le chunk
    const chunkWords = chunk.split(/\s+/).length;
    currentWordCount += chunkWords;

    // Log progress pour les très gros documents
    // if (wordCount > 100000 && chunks.length % 50 === 0) {
    //   const progress = ((currentWordCount / wordCount) * 100).toFixed(1);
    //   console.log(
    //     `    📄 Progress: ${progress}% (${currentWordCount.toLocaleString()}/${wordCount.toLocaleString()} words)`
    //   );
    // }
  }

  // console.log(
  //   `✅ Large description generated (${
  //     chunks.length
  //   } chunks, ${currentWordCount.toLocaleString()} words)`
  // );
  const result = chunks.join("\n");

  // Libérer les chunks
  chunks.length = 0;

  return result;
};

const generateDescriptionChunk = (
  corpus: Corpus,
  wordCount: number
): string => {
  const selectedLines: string[] = [];
  let currentWordCount = 0;

  // Pour les gros chunks, permettre la réutilisation des lignes
  while (currentWordCount < wordCount) {
    const randomIndex = Math.floor(Math.random() * corpus.length);
    const line = corpus[randomIndex];
    const lineWords = line.split(/\s+/);

    if (currentWordCount + lineWords.length <= wordCount) {
      selectedLines.push(line);
      currentWordCount += lineWords.length;
    } else {
      // Ajouter seulement les mots nécessaires pour atteindre le target
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

  // Pour des descriptions très larges, utiliser le traitement asynchrone
  if (wordCount > 50000) {
    return await generateDescriptionLargeAsync(corpus, wordCount);
  }

  // Pour les autres, utiliser la méthode normale
  return generateDescription(corpus, wordCount);
};

const generateDescriptionLargeAsync = async (
  corpus: Corpus,
  wordCount: number
): Promise<string> => {
  // console.log(
  //   `📝 Async generating large description with ${wordCount.toLocaleString()} words...`
  // );

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

    // Log progress et permettre GC pour les très gros documents
    if (wordCount > 200000 && chunkCount % 100 === 0) {
      const progress = ((currentWordCount / wordCount) * 100).toFixed(1);
      // console.log(
      //   `    📄 Progress: ${progress}% (${currentWordCount.toLocaleString()}/${wordCount.toLocaleString()} words)`
      // );

      // Forcer le garbage collection et yield pour éviter le blocking
      if (global.gc) {
        global.gc();
      }
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  // console.log(
  //   `✅ Async large description generated (${
  //     chunks.length
  //   } chunks, ${currentWordCount.toLocaleString()} words)`
  // );
  const result = chunks.join("\n");

  // Libérer les chunks
  chunks.length = 0;

  return result;
};

const generateProduct = (
  corpus: Corpus,
  descriptionWordLength: number = 1
): Product => {
  return {
    id: crypto.randomUUID(),
    name: faker.commerce.productName(),
    description: generateDescription(corpus, descriptionWordLength),
    createdAt: new Date(),
  };
};

const generateProductAsync = async (
  corpus: Corpus,
  descriptionWordLength: number = 1
): Promise<Product> => {
  return {
    id: crypto.randomUUID(),
    name: faker.commerce.productName(),
    description: await generateDescriptionAsync(corpus, descriptionWordLength),
    createdAt: new Date(),
  };
};

const generateProductUpdate = (
  corpus: Corpus,
  descriptionWordLength: number = 1
): Partial<Product> => {
  const update: Partial<Product> = {
    description: generateDescription(corpus, descriptionWordLength),
  };

  if (Math.random() < UPDATE_NAME_PROBABILITY) {
    update.name = faker.commerce.productName();
  }

  return update;
};

// Générateur streaming pour traiter les documents un par un
async function* generateProductsStream({
  corpus,
  count,
  descriptionWordLength,
}: {
  corpus: Corpus;
  count: number;
  descriptionWordLength?: number;
}): AsyncGenerator<Product, void, unknown> {
  const wordLength = descriptionWordLength ?? 1;
  console.log(
    `🏭 Streaming generation of ${count} products with ${wordLength.toLocaleString()} words each...`
  );

  const fifteenPercent = Math.floor(count * 0.15);
  for (let i = 0; i < count; i++) {
    if (i % fifteenPercent === 0) {
      console.log(
        `📦 Progress: ${Math.floor(
          (i / count) * 100
        )}%, generated documents ${i}/${count}`
      );
    }
    // console.log(`📦 Generating product ${i + 1}/${count}...`);

    const product = await generateProductAsync(corpus, descriptionWordLength);
    yield product;

    // Log progress et memory usage
    // if (count > 5 && (i + 1) % Math.max(1, Math.floor(count / 15)) === 0) {
    //   const progress = (((i + 1) / count) * 100).toFixed(1);
    //   const memUsage = process.memoryUsage();
    //   console.log(
    //     `📊 Streaming progress: ${progress}% - Memory: ${Math.round(
    //       memUsage.heapUsed / 1024 / 1024
    //     )}MB heap`
    //   );
    // }

    // Forcer le garbage collection pour les très gros documents
    if (wordLength > 100000) {
      if (global.gc) {
        global.gc();
      }
      // Délai pour permettre le GC et éviter de saturer le système
      if (wordLength > 500000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  console.log(`✅ Streaming generation completed for ${count} products`);
}

// Version async pour générer plusieurs produits
const generateProductsAsync = async ({
  corpus,
  count,
  descriptionWordLength,
}: {
  corpus: Corpus;
  count: number;
  descriptionWordLength?: number;
}): Promise<Product[]> => {
  const wordLength = descriptionWordLength ?? 1;
  // Pour de gros documents ou beaucoup de documents, recommander l'usage du stream
  if (wordLength > 50000 || count * wordLength > 500000) {
    console.log(
      `⚠️  Large generation detected. Consider using generateProductsStream instead for better memory management.`
    );
  }

  const products: Product[] = [];

  console.log(
    `🏭 Async generating ${count} products with ${wordLength.toLocaleString()} words each...`
  );

  for (let i = 0; i < count; i++) {
    // console.log(`📦 Generating product ${i + 1}/${count}...`);

    const product = await generateProductAsync(corpus, descriptionWordLength);
    products.push(product);

    // Log progress
    if (count > 5 && (i + 1) % Math.max(1, Math.floor(count / 10)) === 0) {
      const progress = (((i + 1) / count) * 100).toFixed(1);
      const memUsage = process.memoryUsage();
      console.log(
        `📊 Progress: ${progress}% - Memory: ${Math.round(
          memUsage.heapUsed / 1024 / 1024
        )}MB`
      );
    }

    // Forcer le garbage collection pour les très gros documents
    if (wordLength > 100000) {
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
    generateProduct: (descriptionWordLength: number = 1) =>
      generateProduct(corpus, descriptionWordLength),

    generateProducts: (count: number, descriptionWordLength: number = 1) =>
      Array.from({ length: count }, () =>
        generateProduct(corpus, descriptionWordLength)
      ),

    generateProductAsync: (descriptionWordLength: number = 1) =>
      generateProductAsync(corpus, descriptionWordLength),

    generateProductsAsync: (count: number, descriptionWordLength: number = 1) =>
      generateProductsAsync({ corpus, count, descriptionWordLength }),

    generateProductsStream: (
      count: number,
      descriptionWordLength: number = 1
    ) => generateProductsStream({ corpus, count, descriptionWordLength }),

    generateProductUpdate: (descriptionWordLength: number = 1) =>
      generateProductUpdate(corpus, descriptionWordLength),

    generateProductUpdates: (
      count: number,
      descriptionWordLength: number = 1
    ) =>
      Array.from({ length: count }, () =>
        generateProductUpdate(corpus, descriptionWordLength)
      ),

    corpus, // Exposer le corpus
  };
};
