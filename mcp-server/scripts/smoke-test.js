const baseUrl = process.env.MCP_TEST_URL || "http://localhost:8787/mcp";

async function rpc(method, params, id = 1, headers = {}) {
  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params
    })
  });

  const json = await response.json();
  return {
    status: response.status,
    headers: response.headers,
    body: json
  };
}

const init = await rpc(
  "initialize",
  {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: {
      name: "parkshare-smoke-test",
      version: "0.1.0"
    }
  },
  1
);

if (init.status !== 200 || init.body.error) {
  throw new Error(`initialize failed: ${JSON.stringify(init.body)}`);
}

const sessionId = init.headers.get("mcp-session-id");
const sessionHeaders = sessionId
  ? {
      "Mcp-Session-Id": sessionId,
      "MCP-Protocol-Version": "2025-11-25"
    }
  : {};

const tools = await rpc("tools/list", {}, 2, sessionHeaders);
if (!tools.body.result?.tools?.length) {
  throw new Error(`tools/list failed: ${JSON.stringify(tools.body)}`);
}

const place = await rpc(
  "tools/call",
  {
    name: "find_nearby_place",
    arguments: {
      query: "supermarket",
      maxResults: 2
    }
  },
  3,
  sessionHeaders
);

if (!place.body.result?.content?.[0]?.text) {
  throw new Error(`tools/call failed: ${JSON.stringify(place.body)}`);
}

console.log(
  JSON.stringify(
    {
      initialized: init.body.result.serverInfo,
      toolCount: tools.body.result.tools.length,
      sampleToolCall: place.body.result.content[0].text
    },
    null,
    2
  )
);
