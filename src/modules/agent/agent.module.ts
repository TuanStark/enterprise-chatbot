import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentGateway } from './agent.gateway';
import { RagModule } from '../rag/rag.module';
import { McpModule } from '../mcp/mcp.module';

@Module({
  imports: [RagModule, McpModule],
  controllers: [],
  providers: [
    AgentService,
    AgentGateway,
  ],
  exports: [AgentService],
})
export class AgentModule { }