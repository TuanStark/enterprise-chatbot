// src/mcp/mcp.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import Database from 'better-sqlite3';
import axios from 'axios';
import { z } from 'zod';

@Injectable()
export class McpService implements OnModuleInit {
  private readonly logger = new Logger(McpService.name);
  private db = new Database('data/customers.db');

  async onModuleInit() {
    const server = new McpServer({ name: 'EnterpriseMCP', version: '1.0' });

    server.registerTool(
      'query_db',
      {
        description: 'Query realtime DB',
        inputSchema: z.object({
          sql: z.string(),
        }),
      },
      async ({ sql }) => {
        try {
          const stmt = this.db.prepare(sql);
          const results = stmt.all();
          return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
          };
        } catch (e) {
          this.logger.error('DB tool error', e);
          return {
            isError: true,
            content: [{ type: 'text', text: e.message }],
          };
        }
      },
    );

    server.registerTool(
      'call_api',
      {
        description: 'Call external API for actions',
        inputSchema: z.object({
          url: z.string(),
          method: z.string(),
          body: z.object({}).passthrough().optional(),
        }),
      },
      async ({ url, method, body }) => {
        try {
          const res = await axios({ url, method, data: body });
          return {
            content: [
              { type: 'text', text: JSON.stringify(res.data, null, 2) },
            ],
          };
        } catch (e) {
          this.logger.error('API tool error', e);
          return {
            isError: true,
            content: [{ type: 'text', text: e.message }],
          };
        }
      },
    );

    const app = createMcpExpressApp();
    const transports = new Map<string, SSEServerTransport>();

    app.get('/sse', async (req, res) => {
      const transport = new SSEServerTransport('/messages', res);
      transports.set(transport.sessionId, transport);
      await server.connect(transport);

      transport.onclose = () => {
        transports.delete(transport.sessionId);
      };
    });

    app.post('/messages', async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports.get(sessionId);
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send('Session not found');
      }
    });

    const port = 8001;
    app.listen(port, '0.0.0.0', () => {
      this.logger.log(`MCP server running on ${port}`);
    });
  }
}
