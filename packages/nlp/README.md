# @sker/nlp

Baidu NLP API client for sentiment analysis and text processing.

## Installation

This package is part of the Sker monorepo and is installed automatically via the workspace.

## Usage

```typescript
import { BaiduNLPClient } from '@sker/nlp';

const nlpClient = new BaiduNLPClient({
  apiKey: process.env.BAIDU_NLP_API_KEY!,
  secretKey: process.env.BAIDU_NLP_SECRET_KEY!
});

const result = await nlpClient.analyzeSentiment('这是一个很棒的产品');

console.log(result);
```

## Environment Variables

The following environment variables are required:

- `BAIDU_NLP_API_KEY`: Your Baidu API key
- `BAIDU_NLP_SECRET_KEY`: Your Baidu secret key

## API

### `BaiduNLPClient`

The main client for interacting with Baidu NLP services.

#### Methods

##### `analyzeSentiment(text: string): Promise<SentimentResult>`

Analyzes the sentiment of the provided text.

**Parameters:**
- `text`: The text to analyze

**Returns:**
A `SentimentResult` object containing:
- `text`: The original text
- `items`: Array of sentiment analysis results
  - `positive_prob`: Probability of positive sentiment (0-1)
  - `negative_prob`: Probability of negative sentiment (0-1)
  - `confidence`: Confidence score (0-1)
  - `sentiment`: 0 (negative), 1 (neutral), or 2 (positive)
- `log_id`: Request ID from Baidu API

## Architecture

The client automatically manages access token lifecycle:
- Tokens are cached and reused until expiry
- Automatic token refresh when needed
- Thread-safe token management

## License

Private package - part of Sker monorepo
