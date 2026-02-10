import {
  Controller,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { RagService } from './rag.service';
import * as path from 'path';
import * as fs from 'fs/promises';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('index')
  async index(@Body('dir') dir?: string) {
    return this.ragService.indexData(dir);
  }

  @Post('retrieve')
  async retrieve(@Body('query') query: string) {
    return this.ragService.retrieve(query);
  }

  // Upload doanh nghiệp PDF/tài liệu và index vào ChromaDB
  @Post('upload')
  async upload(@Req() req: any) {
    // Thư mục lưu file thô phía server (trùng với default của RagService)
    const targetDir = path.join(__dirname, '../../data/policies');
    await fs.mkdir(targetDir, { recursive: true });

    const parts = req.parts(); // từ @fastify/multipart
    let count = 0;

    for await (const part of parts) {
      if (part.type === 'file') {
        const filePath = path.join(targetDir, part.filename);
        const writeStream = await fs.open(filePath, 'w');
        try {
          for await (const chunk of part.file) {
            await writeStream.write(chunk);
          }
          count++;
        } finally {
          await writeStream.close();
        }
      }
    }

    // Sau khi lưu xong, index toàn bộ thư mục vào Chroma
    await this.ragService.indexData(targetDir);

    return {
      uploadedFiles: count,
      indexedFrom: targetDir,
    };
  }
}
