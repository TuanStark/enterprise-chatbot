import { Controller, Post, Body } from '@nestjs/common';
import { AgentService } from './agent.service';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  async handleChat(@Body() payload: { query: string; sessionId: string }) {
    //   console.log('Received chat event from client:', payload);
      const response = await this.agentService.handleQuery(payload.query, payload.sessionId || 'default');
      return response;
    }
}
