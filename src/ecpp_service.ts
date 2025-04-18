// 引入需要的模組
import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

const LOGIN_API = "http://localhost:18000/api/v1/auth/login";
const AUTH_API = "http://localhost:18000/api/v1/auth/authenticate";

async function executeCurl(command: string) {
  try {
    const { stdout, stderr } = await execPromise(command);
    return stdout;
  } catch (error) {
    console.error(`error: ${error}`);
    throw error;
  }
}

function extractEmqsess(cookieString: string) {
  const match = cookieString.match(/emqsess=([^;]+)/);
  if (match && match[1]) {
    return match[1];
  }
  throw new Error("no emqsess");
}

let sessionId = "";

export async function loginAndAuth(username: string, password: string) {
  try {
    const loginData = {
      username: username,
      password: password,
      admin: false,
    };

    const loginCommand = `curl ${LOGIN_API} \
      -H "Content-Type: application/json" \
      -d '${JSON.stringify(loginData)}' \
      -v`;
    const loginResponse = await executeCurl(loginCommand);
    try {
      const loginResult = JSON.parse(loginResponse);
      if (
        loginResult.data &&
        loginResult.data.cookies &&
        loginResult.data.cookies.length > 0
      ) {
        const cookieString = loginResult.data.cookies[0];
        sessionId = extractEmqsess(cookieString);
      }
    } catch (e) {
      console.error("loginAndAuth parse json error", e);

      const setCookieMatch = loginResponse.match(/Set-Cookie: emqsess=([^;]+)/);
      if (setCookieMatch && setCookieMatch[1]) {
        sessionId = setCookieMatch[1];
      }
    }

    if (!sessionId) {
      throw new Error("login failed, no emqsess");
    }

    const authCommand = `curl ${AUTH_API} \
      -H "Content-Type: application/json" \
      -d '{ "emqsess": "${sessionId}" }'`;

    const authResponse = await executeCurl(authCommand);
    const authResult = JSON.parse(authResponse);

    if (!authResult.data) {
      throw new Error("no user data");
    }

    const userInfo = authResult.data;

    const command = `curl http://localhost:18000/api/v1/auth/me \
    -H "Content-Type: application/json" \
    -d '{ "emqsess": "${sessionId}" }'`;

    const response = await executeCurl(command);
    const result = JSON.parse(response);
    return result;
  } catch (error) {
    console.error(`error: ${error}`);
  }
  return "";
}

export async function getSenders(senderName: string) {
  try {
    // Check if we have a valid sessionId
    if (!sessionId) {
      console.error(
        "try to getSenders but No valid session ID found. Please login again."
      );
      return [
        {
          type: "text",
          text: "Error: No valid session ID. Please login again.",
        },
      ];
    }

    const body = {
      page: 1,
      name: senderName,
      recipient_name: "",
      page_size: 20,
      include_recipeint: false,
    };

    // Log the request being made for debugging
    console.log(`Searching senders with name: ${senderName}`);
    console.log(`Using session ID: ${sessionId.substring(0, 5)}...`);

    // Updated command with proper Authorization format (Bearer token)
    // and using the same domain pattern as the other API calls
    const command = `curl http://localhost:18000/api/v1/senders/search \
      -H "Content-Type: application/json" \
      -H "Authorization: ${sessionId}" \
      -d '${JSON.stringify(body)}'`;

    const response = await executeCurl(command);

    try {
      const result = JSON.parse(response);

      if (!result.data || !result.data.senders) {
        return [
          {
            type: "text",
            text: `No senders data found. Response status: ${
              result.status?.code || "unknown"
            }`,
          },
        ];
      }

      const senders = result.data.senders.map((sender: any) => {
        return sender.business
          ? { type: "text", text: `Business: ${sender.business.company_name}` }
          : {
              type: "text",
              text: `Individual: ${sender.legal_name_last} ${sender.legal_name_first}`,
            };
      });

      // If no senders found, return a clear message
      if (senders.length === 0) {
        return [
          { type: "text", text: "No senders found matching your criteria." },
        ];
      }

      return senders;
    } catch (parseError) {
      console.error(`Failed to parse JSON response: ${parseError}`);
      return [
        {
          type: "text",
          text: `Error parsing response. Raw response: ${response.substring(
            0,
            100
          )}...`,
        },
      ];
    }
  } catch (error) {
    console.error(`Error in getSenders: ${error}`);
    return [{ type: "text", text: `An error occurred: ${error}` }];
  }
}

export async function createBusinessSender({
  companyName,
  companyTradingName,
  countryCode,
  companyRegistrationNumber,
  companyRegistrationCountry,
  addressLine,
  addressCity,
  addressCountry,
  mobileNumber,
}: any) {
  const body = {
    segment: "business",
    country: countryCode,
    company_name: companyName,
    company_trading_name: companyTradingName,
    company_registration_number: companyRegistrationNumber,
    company_registration_country: companyRegistrationCountry,
    address_line: addressLine,
    address_city: addressCity,
    address_country: addressCountry,
    mobile_number: mobileNumber,
  };

  const command = `curl http://ecppweb.local:18000/api/v1/senders/business \
    -H "Content-Type: application/json" \
    -H "Authorization: ${sessionId}" \
    -d '${JSON.stringify(body)}'`;

  const response = await executeCurl(command);
  const result = JSON.parse(response);
  if (result.status.code !== 200) {
    throw new Error(result.status.message);
  }
  return result;
}

export async function getCreatedReviewByYou() {
  //const credentials = loadCredentials();
  const body = { page_number: 0, status: -1, business_type: "all" };

  const command = `curl http://ecppweb.local:18000/api/v1/transfer-batch/created-by-you \
    -H "Content-Type: application/json" \
    -H "Authorization: ${sessionId}" \
    -d '${JSON.stringify(body)}'`;

  const response = await executeCurl(command);
  const result = JSON.parse(response);
  const senders = result.data.batches.map((batch: any) => {
    return {
      type: "text",
      text: `${batch.batch_id}, ${batch.transfers_principal_info[0].exchange_amount}, transfer: ${batch.transfers_principal_info[0].to_currency_code}, checker: ${batch.checker}`,
    };
  });
  return senders;
}
