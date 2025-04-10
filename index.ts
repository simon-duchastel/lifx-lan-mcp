#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// const LIST_LIGHTS_TOOL: Tool = {
//   name: "lifx_lan_list_lights",
//   description:
//     "Searches for local businesses and places using Brave's Local Search API. " +
//     "Best for queries related to physical locations, businesses, restaurants, services, etc. " +
//     "Returns detailed information including:\n" +
//     "- Business names and addresses\n" +
//     "- Ratings and review counts\n" +
//     "- Phone numbers and opening hours\n" +
//     "Use this when the query implies 'near me' or mentions specific locations. " +
//     "Automatically falls back to web search if no local results are found.",
//   inputSchema: {
//     type: "object",
//     properties: {},
//     required: []
//   }
// };

// // Server implementation
// const server = new Server(
//   {
//     name: "lifx-lan-",
//     version: "0.1.0",
//   },
//   {
//     capabilities: {
//       tools: {},
//     },
//   },
// );

// // Tool handlers
// server.setRequestHandler(ListToolsRequestSchema, async () => ({
//   tools: [],
// }));
  
// server.setRequestHandler(CallToolRequestSchema, async (request) => {
//   try {
//     const { name, arguments: args } = request.params;
  
//     if (!args) {
//       throw new Error("No arguments provided");
//     }
  
//     switch (name) {  
//       case LIST_LIGHTS_TOOL.name: {
//         return {
//           content: [{ type: "text", text: "TODO" }],
//           isError: false,
//         };
//       }
  
//       default:
//         return {
//           content: [{ type: "text", text: `Unknown tool: ${name}` }],
//           isError: true,
//         };
//     }
//   } catch (error) {
//     return {
//       content: [
//         {
//           type: "text",
//           text: `Error: ${error instanceof Error ? error.message : String(error)}`,
//         },
//       ],
//       isError: true,
//     };
//   }
// });

// async function runServer() {
//   const transport = new StdioServerTransport();
//   await server.connect(transport);
//   console.error("Lifx LAN MCP Server running on stdio");
// }

// runServer().catch((error) => {
//   console.error("Fatal error running server:", error);
//   process.exit(1);
// });

// @ts-ignore
import Lifx from 'node-lifx-lan';

Lifx.discover().then((deviceList: any) => {
  var toReturn: any;
  deviceList.forEach((device: any) => {
    console.log(JSON.stringify(device.deviceInfo.label));
    if (device.deviceInfo.label == "Cooked Lamp") {
      console.log("getting state...")
      // toReturn = device.getLightState();
      // todo: replace with original value: {"hue":0.00092,"saturation":0,"brightness":1,"kelvin":3200}
      toReturn = device.setColor({
        color: {
          hue: 0.00092,
          saturation: 0,
          brightness: 1,
          kelvin: 3200,
        },
        duration: 3000
      });
    }
  });
  return toReturn;
}).then((res: any) => {
  console.log('Done! ' + JSON.stringify(res));
}).catch((error: Error) => {
  console.error(error);
});