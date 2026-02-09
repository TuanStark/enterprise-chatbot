import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'o3-mini',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  VECTOR_DB: process.env.VECTOR_DB || 'chroma',
  CHROMA_URL: process.env.CHROMA_URL || 'http://localhost:8000',
};
