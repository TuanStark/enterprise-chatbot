import { Injectable, Logger } from '@nestjs/common';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Chroma } from '@langchain/community/vectorstores/chroma'; // Default local
import { OpenAIEmbeddings } from '@langchain/openai';
import { config } from '../../common/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Document } from '@langchain/core/documents';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private vectorStore: any; // Chroma or PineconeStore

  constructor() {
    // Switch DB: env VECTOR_DB=chroma or pinecone
    if (config.VECTOR_DB === 'pinecone') {
      // const pinecone = new Pinecone({ apiKey: config.OPENAI_API_KEY });
      // this.vectorStore = new PineconeStore(new OpenAIEmbeddings(), {
      //   pineconeIndex: pinecone.Index(process.env.PINECONE_INDEX_NAME),
      //   namespace: 'enterprise',
      // });
    } else {
      // Chroma default
      this.vectorStore = new Chroma(
        new OpenAIEmbeddings({ openAIApiKey: config.OPENAI_API_KEY }),
        {
          url: config.CHROMA_URL,
          collectionName: 'enterprise_policies',
        },
      );
    }
  }

  async indexData(dir = path.join(__dirname, '../../data/policies')) {
    try {
      const files = await fs.readdir(dir);
      let docs: Document[] = [];
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          const loader = new PDFLoader(path.join(dir, file));
          docs = docs.concat(await loader.load());
        }
      }
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const chunks = await splitter.splitDocuments(docs);

      await this.vectorStore.addDocuments(chunks);
      this.logger.log(`Indexed ${chunks.length} chunks successfully`);
    } catch (error) {
      this.logger.error('Index error', error);
      throw error;
    }
  }

  async retrieve(query: string) {
    try {
      const retriever = this.vectorStore.asRetriever({ k: 10, verbose: true }); // Debug verbose
      // Newer LangChain retrievers expose `invoke` instead of `getRelevantDocuments`
      const docs = await retriever.invoke(query);
      return docs
        .map((doc) => ({
          content: doc.pageContent,
          source: doc.metadata.source,
        }))
        .join('\n\n');
    } catch (error) {
      this.logger.error('Retrieve error', error);
      return '';
    }
  }

  // Add rerank for smarter retrieval (install @langchain/cohere-rerank nếu cần)
  async advancedRetrieve(query: string) {
    // Code rerank here for production...
  }
}
