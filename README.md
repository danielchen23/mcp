# MCP Implementation

![mcp](./mcp.svg)

## Server side

1. Introduce Anthropic SDK

   ```tsx
   const server = new McpServer({
     name: "demo",
     version: "1.0.0",
   });
   ```

2. Create tool interface for client calling

   ```tsx
   server.tool(
     "loginECPP",
     "login and auth in ecpp",
     { username: z.string(), password: z.string() },
     async ({ username, password }) => {
       const result = await loginAndAuth(username, password);
       return {
         content: [
           { type: "text", text: result.username },
           { type: "text", text: result.display_name },
           { type: "text", text: result.partner.name },
           {
             type: "text",
             text: result.roles.join(", "),
           },
         ],
       };
     }
   );
   ```

3. Use transport to communicates with a MCP client by reading from the current process' stdin and writing to stdout

   ```tsx
   async function main() {
     const transport = new StdioServerTransport();
     await server.connect(transport);
     console.error("MCP Server running on stdio");
   }
   ```

## Client side

1. Introduce Anthropic SDK

   ```tsx
   constructor() {
       this.client = new Client({ name: "mcp-client-cli", version: "1.0.0" });
     }
   ```

2. Connect to mcp server **(npx ts-node src/client.ts dist/server.js)**

   ```tsx
   this.transport = new StdioClientTransport({
     command,
     args: [serverScriptPath],
   });
   this.client.connect(this.transport);
   ```

3. Connect to local LLM with supported tool format, should align with server tool name. I host qwen 2.5 by ollama.

   ```tsx
   const response = await fetch("http://localhost:11434/api/chat", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       model: "qwen2.5",
       stream: false,
       messages: message,
       tools: [
         {
           type: "function",
           function: {
             name: "loginECPP",
             description: "login to ecpp",
             parameters: {
               type: "object",
               properties: {
                 username: { type: "string" },
                 password: { type: "string" },
               },
               required: ["username", "password"],
             },
           },
         },
       ],
     }),
   });
   ```

4. Send the message to llm and response with tool_calls payload

   ```tsx
   {
     "model": "qwen2.5",
     "created_at": "2025-04-15T03:24:59.696583Z",
     "message": {
       "role": "assistant",
       "content": "",
       "tool_calls": [
         {
           "function": {
             "name": "loginECPP",
             "arguments": {
               "password": "123456",
               "username": "username"
             }
           }
         }
       ]
     },
     "done_reason": "stop",
     "done": true,
     "total_duration": 1581841959,
     "load_duration": 28648084,
     "prompt_eval_count": 558,
     "prompt_eval_duration": 301070208,
     "eval_count": 47,
     "eval_duration": 1222762000
   }

   ```

5. Match the tool_calls and call the function via sdk transport, **this.client.callTool** trigger the function in server side

   ```tsx
   for (const toolCall of response.message.tool_calls) {
     // Call the tool
     const result = await this.client.callTool({
       name: toolCall.function.name,
       arguments: toolCall.function.arguments,
     });
   }
   ```

6. Push message by role: tool if continue the dialog

   ```tsx
   messages.push({
        role: "tool",
        name: toolCall.function.name,
        content: response text,
   });
   ```

## Benefit

1. Service providers only need to export the tools/API they offer and don’t have to worry about which clients use them.

2. Client providers only need to focus on the user experience and interaction with the LLM.
