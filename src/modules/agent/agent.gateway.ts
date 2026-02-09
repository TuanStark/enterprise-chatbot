// src/agent/agent.gateway.ts
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AgentService } from './agent.service';

@WebSocketGateway({ cors: true })
export class AgentGateway {
  @WebSocketServer() server: Server;

  constructor(private agentService: AgentService) {}

  @SubscribeMessage('chat')
  async handleChat(client: any, payload: { query: string; sessionId: string }) {
    const response = await this.agentService.handleQuery(
      payload.query,
      payload.sessionId,
    );
    client.emit('response', response);
  }
}
