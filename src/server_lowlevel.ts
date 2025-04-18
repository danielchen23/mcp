import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  createBusinessSender,
  getCreatedReviewByYou,
  getSenders,
  loginAndAuth,
} from "./ecpp_service";
import z from "zod";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Create an MCP server
const server = new Server(
  {
    name: "example-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const loginEcppSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const searchSendersSchema = z.object({
  senderName: z.string().optional().describe("Sender name"),
});
const createBusinessSenderSchema = z.object({
  companyName: z.string().describe("Company name"),
  companyTradingName: z.string().describe("Company trading name"),
  countryCode: z.string().describe("Country code"),
  companyRegistrationNumber: z.string().describe("Company registration number"),
  companyRegistrationCountry: z
    .string()
    .describe("Company registration country"),
  addressLine: z.string().describe("Address line"),
  addressCity: z.string().describe("Address city"),
  addressCountry: z.string().describe("Address country"),
  mobileNumber: z.string().describe("Mobile number"),
});
const getCreatedReviewByYouSchema = z.object({});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "loginECPP",
        description: "login and auth in ecpp",
        inputSchema: zodToJsonSchema(loginEcppSchema) as ToolInput,
      },
      {
        name: "searchSenders",
        description: "search senders",
        inputSchema: zodToJsonSchema(searchSendersSchema) as ToolInput,
      },
      {
        name: "getCreatedReviewByYou",
        description: "list created transfers created by user",
        inputSchema: zodToJsonSchema(getCreatedReviewByYouSchema) as ToolInput,
      },
      {
        name: "createBusinessSender",
        description: "create business sender data",
        inputSchema: zodToJsonSchema(createBusinessSenderSchema) as ToolInput,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case "loginECPP": {
      const parsed = loginEcppSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for login ecpp: ${parsed.error}`);
      }
      const result = await loginAndAuth(
        parsed.data.username,
        parsed.data.password
      );
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
    case "searchSenders": {
      const parsed = searchSendersSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments for searchSenders: ${parsed.error}`);
      }
      const result = await getSenders(parsed.data.senderName || "");
      return {
        content: result,
      };
    }
    case "getCreatedReviewByYou": {
      const parsed = getCreatedReviewByYouSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(
          `Invalid arguments for getCreatedReviewByYou: ${parsed.error}`
        );
      }
      const result = await getCreatedReviewByYou();
      return {
        content: result,
      };
    }
    case "createBusinessSender": {
      const parsed = createBusinessSenderSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(
          `Invalid arguments for createBusinessSender: ${parsed.error}`
        );
      }
      const result = await createBusinessSender({
        companyName: parsed.data.companyName,
        companyTradingName: parsed.data.companyTradingName,
        countryCode: parsed.data.countryCode,
        companyRegistrationCountry: parsed.data.companyRegistrationCountry,
        companyRegistrationNumber: parsed.data.companyRegistrationNumber,
        addressLine: parsed.data.addressLine,
        addressCity: parsed.data.addressCity,
        addressCountry: parsed.data.addressCountry,
        mobileNumber: parsed.data.mobileNumber,
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
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
