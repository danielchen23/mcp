export const tools_config = [
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
  {
    type: "function",
    function: {
      name: "searchSenders",
      description: "search senders",
      parameters: {
        type: "object",
        properties: {
          senderName: { type: "string", description: "Sender name" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCreatedReviewByYou",
      description: "list created transfers created by user",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createBusinessSender",
      description: "create business sender data",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string", description: "Company name" },
          companyTradingName: {
            type: "string",
            description: "Company trading name",
          },
          countryCode: { type: "string", description: "Country code" },
          companyRegistrationNumber: {
            type: "string",
            description: "Company registration number",
          },
          companyRegistrationCountry: {
            type: "string",
            description: "Company registration country",
          },
          addressLine: { type: "string", description: "Address line" },
          addressCity: { type: "string", description: "Address city" },
          addressCountry: { type: "string", description: "Address country" },
          mobileNumber: { type: "string", description: "Mobile number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getFxRate",
      description: "get fx rate",
    },
  },
];
