import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AgentService } from './agent.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class AgentGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly agentService: AgentService) {
    console.log('AgentGateway initialized - ready for connections');
  }

  @SubscribeMessage('chat')
  async handleChat(@MessageBody() payload: { query: string; sessionId: string }) {
    console.log('Received chat event from client:', payload);
    const response = await this.agentService.handleQuery(payload.query, payload.sessionId || 'default');
    this.server.emit('response', response);
  }
}