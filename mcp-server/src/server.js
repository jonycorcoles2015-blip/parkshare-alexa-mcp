import http from "node:http";
import crypto from "node:crypto";
import { callParkShareTool, toolDefinitions } from "./parkshareTools.js";

const PORT = Number(process.env.PORT || 8787);
const MCP_PATH = process.env.MCP_PATH || "/mcp";
const PROTOCOL_VERSION = "2025-11-25";

const sessions = new Map();

function jsonRpcResult(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result
  };
}

function jsonRpcError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      ...(data ? { data } : {})
    }
  };
}

function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    ...headers
  });
  res.end(payload);
}

function sendSse(res, event, body) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(body)}\n\n`);
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleRpc(req, res) {
  let payload;

  try {
    const rawBody = await readBody(req);
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch (error) {
    sendJson(res, 400, jsonRpcError(null, -32700, "Parse error", { message: error.message }));
    return;
  }

  if (Array.isArray(payload)) {
    const responses = await Promise.all(payload.map((item) => dispatchRpc(req, res, item)));
    sendJson(res, 200, responses.filter(Boolean));
    return;
  }

  const response = await dispatchRpc(req, res, payload);
  if (response) {
    sendJson(res, 200, response, response._headers);
  } else {
    res.writeHead(202, { "Access-Control-Allow-Origin": "*" });
    res.end();
  }
}

async function dispatchRpc(req, res, payload) {
  if (!payload || payload.jsonrpc !== "2.0" || typeof payload.method !== "string") {
    return jsonRpcError(payload?.id, -32600, "Invalid Request");
  }

  try {
    switch (payload.method) {
      case "initialize":
        return initialize(payload);
      case "notifications/initialized":
        markInitialized(req);
        return null;
      case "ping":
        return jsonRpcResult(payload.id, {});
      case "tools/list":
        return jsonRpcResult(payload.id, {
          tools: toolDefinitions.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }))
        });
      case "tools/call":
        return await callTool(payload);
      default:
        return jsonRpcError(payload.id, -32601, `Method not found: ${payload.method}`);
    }
  } catch (error) {
    return jsonRpcError(payload.id, -32000, error.message);
  }
}

function initialize(payload) {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    initialized: false,
    createdAt: new Date().toISOString(),
    clientInfo: payload.params?.clientInfo || null
  });

  const response = jsonRpcResult(payload.id, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {
        listChanged: false
      }
    },
    serverInfo: {
      name: "parkshare-alexa-mcp-server",
      version: "0.1.0"
    },
    instructions:
      "Use ParkShare tools for parking, nearby-place search, road alerts and parking spot release flows."
  });

  response._headers = {
    "Mcp-Session-Id": sessionId,
    "MCP-Protocol-Version": PROTOCOL_VERSION
  };

  return response;
}

function markInitialized(req) {
  const sessionId = req.headers["mcp-session-id"];
  if (sessionId && sessions.has(sessionId)) {
    sessions.get(sessionId).initialized = true;
  }
}

async function callTool(payload) {
  const name = payload.params?.name;
  const args = payload.params?.arguments || {};

  if (!name) {
    return jsonRpcError(payload.id, -32602, "Missing tool name");
  }

  const result = await callParkShareTool(name, args);

  return jsonRpcResult(payload.id, {
    content: [
      {
        type: "text",
        text: result.spoken
      }
    ],
    structuredContent: result.data
  });
}

function handleHealth(res) {
  sendJson(res, 200, {
    ok: true,
    name: "parkshare-alexa-mcp-server",
    protocolVersion: PROTOCOL_VERSION,
    mcpPath: MCP_PATH,
    tools: toolDefinitions.map((tool) => tool.name)
  });
}

function handleOptions(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
  });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    handleOptions(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    handleHealth(res);
    return;
  }

  if (url.pathname !== MCP_PATH) {
    sendJson(res, 404, { error: "Not found", mcpPath: MCP_PATH });
    return;
  }

  if (req.method === "GET") {
    sendSse(res, "message", {
      jsonrpc: "2.0",
      method: "notifications/message",
      params: {
        level: "info",
        logger: "parkshare",
        data: "ParkShare MCP server is ready for JSON-RPC POST requests."
      }
    });
    return;
  }

  if (req.method === "DELETE") {
    const sessionId = req.headers["mcp-session-id"];
    if (sessionId) sessions.delete(sessionId);
    res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  await handleRpc(req, res);
});

server.listen(PORT, () => {
  console.log(`ParkShare MCP server listening on http://localhost:${PORT}${MCP_PATH}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
