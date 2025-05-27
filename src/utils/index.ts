import path from "path";

export * from "./logger";

export const DEFAULT_CORPUS_PATH = path.join(
  __dirname,
  "../../data/corpus/lines.txt"
);
