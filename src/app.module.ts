import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RagModule } from './modules/rag/rag.module';
import { McpModule } from './modules/mcp/mcp.module';
import { AgentModule } from './modules/agent/agent.module';

@Module({
  imports: [RagModule, McpModule, AgentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
