import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai'; // <-- Thay đổi ở đây
import { RagService } from '../rag/rag.service';
import { McpClientHelper } from '../mcp/mcp.client';
import { BufferMemory } from '@langchain/classic/memory';
import { RedisChatMessageHistory } from '@langchain/redis'; // <-- Đây là package mới
import ioredis from 'ioredis';
import {
    RunnableSequence,
    RunnablePassthrough,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { config } from '../../common/config';

@Injectable()
export class AgentService {
    private readonly logger = new Logger(AgentService.name);
    private llm: ChatOpenAI;
    private memory: BufferMemory;

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

        // Memory scale với Redis (giữ nguyên)
        this.memory = new BufferMemory({
            chatHistory: new RedisChatMessageHistory({
                sessionId: 'default_session', // có thể dynamic theo userId
                client: new ioredis(config.REDIS_URL),
            }),
        });
    }

    async handleQuery(query: string, sessionId: string): Promise<string> {
        try {
            // Load memory từ Redis
            const history = await this.memory.loadMemoryVariables({});

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
            const plan = JSON.parse(reasoningResponse.content as string);

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
            const finalChain = RunnableSequence.from([
                RunnablePassthrough.assign({
                    rag: () => ragContext,
                    mcp: () => (mcpResult ? JSON.stringify(mcpResult) : 'Không dùng MCP'),
                    history: () =>
                        history.chatHistory
                            ?.map((m) => `${m.role}: ${m.content}`)
                            .join('\n') || '',
                }),
                this.llm,
                new StringOutputParser(),
            ]);

            const finalPrompt = `
                Context từ RAG: {rag}
                Kết quả MCP (nếu có): {mcp}
                Lịch sử chat: {history}

                Trả lời query: "${query}"
                - Chính xác, ngắn gọn, chuyên nghiệp.
                - Trích dẫn nguồn nếu từ RAG.
                - Không bịa thông tin.
            `;

            const response = await finalChain.invoke({});

            // Lưu memory cho session tiếp theo
            await this.memory.saveContext({ input: query }, { output: response });

            return response;
        } catch (error) {
            this.logger.error('Agent handleQuery error', error.stack);
            return 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ hỗ trợ.';
        }
    }
}
