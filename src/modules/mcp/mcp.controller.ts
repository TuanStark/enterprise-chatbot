import { Controller } from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}
}
