import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  createBusinessSender,
  getCreatedReviewByYou,
  getSenders,
  loginAndAuth,
} from "./ecpp_service";
import z from "zod";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// Create an MCP server
const server = new McpServer({
  name: "demo",
  version: "1.0.0",
});

server.tool(
  "loginECPP",
  "login and auth in ecpp",
  { username: z.string(), password: z.string() },
  async ({ username, password }) => {
    const result = await loginAndAuth(username, password);
    return {
      content: [
        { type: "text", text: `username is ${result.username}` },
        { type: "text", text: `display name is ${result.display_name}` },
        { type: "text", text: `partner is ${result.partner.name}` },
        {
          type: "text",
          text: `role is ${result.roles.join(",")}`,
        },
      ],
    };
  }
);

server.tool(
  "searchSenders",
  "search senders",
  {
    senderName: z.string().optional().describe("Sender name"),
  },
  async ({ senderName }) => {
    const result = await getSenders(senderName || "");
    return {
      content: result,
    };
  }
);

server.tool(
  "createBusinessSender",
  "create business sender data",
  {
    companyName: z.string().describe("Company name"),
    companyTradingName: z.string().describe("Company trading name"),
    countryCode: z.string().describe("Country code"),
    companyRegistrationNumber: z
      .string()
      .describe("Company registration number"),
    companyRegistrationCountry: z
      .string()
      .describe("Company registration country"),
    addressLine: z.string().describe("Address line"),
    addressCity: z.string().describe("Address city"),
    addressCountry: z.string().describe("Address country"),
    mobileNumber: z.string().describe("Mobile number"),
  },
  async ({
    companyName,
    companyTradingName,
    countryCode,
    companyRegistrationCountry,
    companyRegistrationNumber,
    addressLine,
    addressCity,
    addressCountry,
    mobileNumber,
  }) => {
    const result = await createBusinessSender({
      companyName,
      companyTradingName,
      countryCode,
      companyRegistrationCountry,
      companyRegistrationNumber,
      addressLine,
      addressCity,
      addressCountry,
      mobileNumber,
    });

    return {
      content: [
        {
          type: "text",
          text: `${result.data.business.company_name} created successfully`,
        },
      ],
    };
  }
);

server.tool(
  "getCreatedReviewByYou",
  "list created transfers created by user",
  {},
  async () => {
    const result = await getCreatedReviewByYou();
    return {
      content: result,
    };
  }
);

server.resource(
  "username",
  "file:///Users/danielchen/Downloads/res.txt",
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: "please find out the username from the file",
      },
    ],
  })
);

server.prompt("login ecpp", {}, () => ({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: `please login and auth in ecpp with username danielchen+ecpp2@emq.com and password !12341234AAaabb`,
      },
    },
  ],
}));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
