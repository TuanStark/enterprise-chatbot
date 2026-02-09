import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RagModule } from './modules/rag/rag.module';
import { McpModule } from './modules/mcp/mcp.module';
import { AgentModule } from './modules/agent/agent.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/logging.interceptor';
import { AgentGateway } from './modules/agent/agent.gateway';

@Module({
  imports: [RagModule, McpModule, AgentModule],
  controllers: [AppController],
  providers: [
    AgentGateway,
    AppService,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule { }
