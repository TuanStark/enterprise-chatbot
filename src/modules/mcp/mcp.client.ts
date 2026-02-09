import { Client } from '@modelcontextprotocol/sdk/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class McpClientHelper {
  private client = new Client({ name: 'EnterpriseMCP', version: '1.0' });

  async callTool(toolName: string, params: any) {
    try {
      return await this.client.callTool({ name: toolName, arguments: params });
    } catch (error) {
      throw new Error(`MCP call failed: ${error.message}`);
    }
  }
}
