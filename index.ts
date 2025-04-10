#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { getLights } from "./src/lifx.js";

const LIST_LIGHTS_TOOL: Tool = {
  name: "lifx_lan_list_lights",
  description:
    "List all Lifx lights currently available on the user's local area network (LAN)." +
    "Each light is specified by a unique string label." +
    "Use this to get which lights the user wants to interact with, as the label " +
    "is used in other tools to interact with lights." +
    "Also includes additional information about the light, such as group and location",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};

// Server implementation
const server = new Server(
  {
    name: "lifx-lan-",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [],
}));
  
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
  
    if (!args) {
      throw new Error("No arguments provided");
    }
  
    switch (name) {  
      case LIST_LIGHTS_TOOL.name: {
        const lights = await getLights();
        const lightsAsString = JSON.stringify(lights);
        return {
          content: [{ type: "text", text: lightsAsString }],
          isError: false,
        };
      }
  
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lifx LAN MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});