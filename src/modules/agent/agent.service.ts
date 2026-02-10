import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai'; // <-- Thay đổi ở đây
import { RagService } from '../rag/rag.service';
import { McpClientHelper } from '../mcp/mcp.client';
import { BufferMemory } from '@langchain/classic/memory';
import { RedisChatMessageHistory } from '@langchain/redis';
import { createClient } from 'redis';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { config } from '../../common/config';

@Injectable()
export class AgentService {
    private readonly logger = new Logger(AgentService.name);
    private llm: ChatOpenAI;
    private redisClient: ReturnType<typeof createClient> | null = null;

    constructor(
        private ragService: RagService,
        private mcpClient: McpClientHelper,
    ) {
        this.llm = new ChatOpenAI({
            model: config.OPENAI_MODEL, // <-- Model bạn muốn: o3-mini (reasoning mạnh, cost thấp)
            temperature: 0.3, // Giữ low temp cho reasoning chính xác
            maxTokens: 2048, // Tùy chỉnh nếu cần context dài
            apiKey: config.OPENAI_API_KEY,
            streaming: true, // Hỗ trợ stream response cho UX tốt hơn
            verbose: true, // Debug chain calls (rất hữu ích)
        });
    }

    private async getRedisClient() {
        if (!this.redisClient) {
            this.redisClient = createClient({ url: config.REDIS_URL });
            await this.redisClient.connect();
        }
        return this.redisClient;
    }

    async handleQuery(query: string, sessionId: string): Promise<string> {
        try {

            const client = await this.getRedisClient();
            const memory = new BufferMemory({
                chatHistory: new RedisChatMessageHistory({
                    sessionId: sessionId || 'default_session',
                    client,
                }),
            });

            // Load memory từ Redis
            const history = await memory.loadMemoryVariables({});

            // Bước 1: Reasoning để decide dùng RAG hay MCP (dùng LLM o3-mini mạnh reasoning)
            const reasoningPrompt = `
                Bạn là agent doanh nghiệp thông minh.
                Query người dùng: "${query}"
                Lịch sử chat: ${JSON.stringify(history.chatHistory?.map((m) => `${m.role}: ${m.content}`).join('\n')) || 'Không có lịch sử'}

                Phân tích và trả về JSON chỉ:
                {
                "use_rag": boolean,          // true nếu cần tra cứu tài liệu tĩnh
                "use_mcp": { "tool": string | null, "params": object | null },  // tool MCP nếu cần action realtime
                "reason": string             // lý do ngắn gọn
                }
            `;

            const reasoningResponse = await this.llm.invoke(reasoningPrompt);
            let rawPlan = reasoningResponse.content as string;

            // Nếu LLM trả về JSON bọc trong ``` ``` thì bỏ wrapper trước khi parse
            rawPlan = rawPlan.trim();
            if (rawPlan.startsWith('```')) {
                const firstNewline = rawPlan.indexOf('\n');
                const lastFence = rawPlan.lastIndexOf('```');
                if (firstNewline !== -1 && lastFence !== -1 && lastFence > firstNewline) {
                    rawPlan = rawPlan.slice(firstNewline + 1, lastFence).trim();
                }
            }

            const plan = JSON.parse(rawPlan);

            let ragContext = '';
            let mcpResult: any = null;

            // Bước 2: Thực hiện theo plan
            if (plan.use_rag) {
                ragContext = await this.ragService.retrieve(query);
            }

            if (plan.use_mcp?.tool) {
                mcpResult = await this.mcpClient.callTool(
                    plan.use_mcp.tool,
                    plan.use_mcp.params,
                );
            }

            // Bước 3: Generate final answer với full context + memory
            const historyText =
                history.chatHistory
                    ?.map((m) => `${m.role}: ${m.content}`)
                    .join('\n') || '';

            const finalPrompt = `
                Context từ RAG:
                ${ragContext || 'Không dùng RAG'}

                Kết quả MCP (nếu có):
                ${mcpResult ? JSON.stringify(mcpResult) : 'Không dùng MCP'}

                Lịch sử chat:
                ${historyText}

                Trả lời query sau một cách chính xác, ngắn gọn, chuyên nghiệp,
                trích dẫn nguồn nếu từ RAG và không bịa thông tin:
                "${query}"
            `;

            const llmResult = await this.llm.invoke(finalPrompt);
            const response = await new StringOutputParser().invoke(llmResult);

            // Lưu memory cho session tiếp theo
            await memory.saveContext({ input: query }, { output: response });

            return response;
        } catch (error) {
            this.logger.error('Agent handleQuery error', error.stack);
            return 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ hỗ trợ.';
        }
    }
}
