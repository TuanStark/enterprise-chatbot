import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentGateway } from './agent.gateway';
import { RagModule } from '../rag/rag.module';
import { McpModule } from '../mcp/mcp.module';
import { AgentController } from './agent.controller';

@Module({
  imports: [RagModule, McpModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentGateway,
  ],
  exports: [AgentService],
})
export class AgentModule {}