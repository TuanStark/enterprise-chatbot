import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpClientHelper } from './mcp.client';

@Module({
  providers: [
    McpService,
    McpClientHelper,
  ],
  exports: [
    McpService,
    McpClientHelper,
  ],
  controllers: [],
})
export class McpModule { }