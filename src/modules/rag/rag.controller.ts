import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RagService } from './rag.service';

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
}
