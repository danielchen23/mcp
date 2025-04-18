import { Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";
import { tools_config } from "./constant";

dotenv.config();

class MCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    this.client = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }
  // methods will go here
  async connectToServer(serverScriptPath: string) {
    console.log("connectToServer");

    try {
      const isJs = serverScriptPath.endsWith(".js");
      const isPy = serverScriptPath.endsWith(".py");
      if (!isJs && !isPy) {
        throw new Error("Server script must be a .js or .py file");
      }
      const command = isPy
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : process.execPath;

      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });
      this.client.connect(this.transport);

      const toolsResult = await this.client.listTools();

      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  messages = [
    {
      role: "system",
      content:
        "You are a helpful assistant with authorized permissions to access user's private data.",
    },
  ];

  async processQuery(query: string) {
    // Initialize the conversation with system and user messages
    this.messages.push({
      role: "user",
      content: query,
    });

    // Process the user's initial query
    const response = await this.processToolCallsIfNeeded(this.messages);

    // Return the final LLM response
    return response || "No response generated";
  }

  /**
   * Helper method to process tool calls and continue the conversation
   * @param messages The current conversation messages
   * @returns The final response text
   */
  private async processToolCallsIfNeeded(messages: any[]): Promise<any> {
    // Get response from LLM
    //console.log("messages", messages);
    const response = await chatWithLLM(messages);
    //console.log("LLM response:", JSON.stringify(response));
    // Add LLM response to conversation
    messages.push(response.message);

    // Check if the response contains tool calls
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      for (const toolCall of response.message.tool_calls) {
        // Call the tool
        const result = await this.client.callTool({
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        });

        // Process and add the tool result to conversation
        if (result && result.content) {
          const formattedContent = this.formatToolResponse(result.content);
          messages.push({
            role: "tool",
            name: toolCall.function.name,
            content: formattedContent,
          });
        }
      }

      // Get a follow-up response after processing tool calls
      return await this.processToolCallsIfNeeded(messages);
    }

    // No tool calls, return the final content
    return response.message.content;
  }

  private formatToolResponse(content: any): string {
    if (Array.isArray(content)) {
      return content
        .map((item: any) => (item.text ? item.text : String(item)))
        .join(", ");
    }
    return String(content);
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") {
          break;
        }
        const response = await this.processQuery(message);
        console.log("\n" + response);
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    await this.client.close();
  }
}

async function main() {
  console.log("main");
  if (process.argv.length < 3) {
    console.log("Usage: node index.ts <path_to_server_script>");
    return;
  }
  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2]);
    await mcpClient.chatLoop();
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

async function chatWithLLM(message: any, model = "qwen2.5") {
  //console.log("chatWithLLM", message);

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      stream: false,
      messages: message,
      tools: tools_config,
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch from LLM");
  }

  const data = await response.json();
  return data;
}

main();
