# Elasticsearch Performance Benchmark Suite

A comprehensive TypeScript-based benchmarking tool for measuring Elasticsearch performance across different indexing strategies, search types, and data configurations. This tool focuses on temporal metrics (indexing time, search performance, update operations) for cloud-based Elasticsearch deployments.

## 🎯 Features

- **Multiple Index Types**: Test standard, n-gram, and stemming analyzers
- **Search Performance**: Benchmark both full-text and fuzzy search operations
- **Scalability Testing**: Vary document count, batch sizes, and content length
- **Update Operations**: Measure reindexing performance during bulk updates
- **Campaign System**: Automated test suites with configurable parameters
- **Data Generation**: Realistic product data using news article corpus

## 📊 Campaign System

The campaign system allows you to run multiple benchmark configurations automatically, varying a single parameter across a range of values with multiple repetitions for statistical reliability.

### Supported Variables

| Variable | Description | Example Range |
|----------|-------------|---------------|
| `numberOfBatches` | Number of indexing batches | 10 → 100 |
| `documentsPerBatch` | Documents per batch | 100 → 10000 |
| `descriptionWordLength` | Words per description | 1 → 1000 |
| `indexType` | Analyzer type | standard, ngram, stemming |
| `numberOfUpdateBatches` | Update operation batches | 5 → 50 |
| `documentsPerUpdateBatch` | Documents per update batch | 50 → 500 |

### CLI Usage

```bash
# Vary documents per batch from 100 to 1000, increment by 300, repeat 3 times
npm run campaign:cli -- --variable documentsPerBatch --min 100 --max 1000 --increment 300 --repetitions 3

# Test different index types
npm run campaign:cli -- --variable indexType --min 0 --max 0 --increment 0 --repetitions 2 --batches 20

# Vary description length with custom base configuration
npm run campaign:cli -- --variable descriptionWordLength --min 10 --max 100 --increment 2 --repetitions 2 --docs-per-batch 500
```

### Programmatic Usage

```typescript
import { runCampaign } from "./src/campaign";
import { createBenchmarkRunner } from "./src/campaign";

const campaignConfig = {
  baseConfig: {
    indexName: "performance-test",
    indexType: "standard",
    numberOfBatches: 10,
    documentsPerBatch: 100, // Will be varied
    descriptionWordLength: 10,
    // ... other config
  },
  variations: {
    variable: "documentsPerBatch",
    min: 100,
    max: 1000,
    increment: 300,
  },
  repetitions: 3,
};

const benchmarkRunner = createBenchmarkRunner({ verbose: true });
const result = await runCampaign(campaignConfig, benchmarkRunner);
```

## 🚀 Quick Start

### Installation

```bash
npm install && docker-compose up -d
curl http://localhost:9200/_cluster/health # Verify Elasticsearch is running
```

### Basic Usage

```bash
npm run test:basic             # Run a simple benchmark test
npm run test:benchmark         # Run a complete benchmark with persistence
npm run test:campaign          # Test the campaign system with mocks
npm run test:campaign-runner   # Test the campaign system with real benchmarks
```

## 🏗️ Architecture

### Core Components

- **Benchmark Runner**: Executes individual benchmark configurations
- **Campaign System**: Orchestrates multiple benchmark runs with parameter variations
- **Data Generator**: Creates realistic test data using faker.js and news corpus
- **Persistence Layer**: Saves results in structured JSON format
- **CLI Tools**: Command-line interface for easy campaign execution

### Data Structure

Each benchmark tests "Product" documents with:

- `id`: Unique identifier
- `name`: Generated product name (faker.js)
- `description`: Variable-length text from news article corpus
- `createdAt`: Timestamp

## 📈 Results & Analysis

### Output Structure

Each benchmark run generates a timestamped JSON file in `data/results/`:

```bash
data/results/
├── benchmark_2025-05-28T10-30-00_standard_10000-docs.json
├── benchmark_2025-05-28T10-35-00_standard_10000-docs.json
└── benchmark_2025-05-28T10-40-00_ngram_10000-docs.json
```

Results include indexing time, search performance, and update metrics for analysis and visualization.

## 🛠️ Development

### Available Scripts

```bash
npm run build                # Compile TypeScript
npm run test:basic           # Basic functionality test
npm run test:benchmark       # Complete benchmark test
npm run test:campaign        # Campaign system test (with mocks)
npm run test:campaign-runner # Campaign system test (real benchmarks)
npm run campaign:cli         # Run campaign via CLI
npm run clean                # Clean build and data directories
```

### Project Structure

```sh
src/
├── benchmark/               # Core benchmark logic
├── campaign/                # Campaign system
├── cli/                     # Command-line interfaces
├── config/                  # Index configurations
├── generator/               # Test data generation
├── persistence/             # Result storage
├── sdk/                     # Elasticsearch SDK wrapper
├── test/                    # Test files
└── types/                   # Type definitions
```

## 📄 License

MIT License - see LICENSE file for details.