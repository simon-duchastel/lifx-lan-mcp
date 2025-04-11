#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { getLights, getLightState, setColorForLight, turnOnLight, turnOff } from "./src/lifx.js";

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

const GET_LIGHTS_STATE_TOOL: Tool = {
  name: "lifx_lan_get_lights_state",
  description: "Get the current state of one or more LIFX lights, including their colors, whether they're " +
  "on or off, and what groups and locations they belong to (if any).",
  inputSchema: {
    type: "object",
    properties: {
      labels: {
        type: "array",
        items: { type: "string" },
        description: "The label of one or more Lifx lights to set the color for. Array cannot be empty."
      },
    },
    required: ["labels"]
  }
};

const SET_LIGHTS_COLOR_TOOL: Tool = {
  name: "lifx_lan_set_lights_color",
  description: "Set the color of one or more Lifx lights. Must specify hue, saturation, brightness, " +
  "and may optionally specify kelvin temperature (otherwise 3500 is used).",
  inputSchema: {
    type: "object",
    properties: {
      labels: {
        type: "array",
        items: { type: "string" },
        description: "The label of one or more Lifx lights to set the color for. Array cannot be empty."
      },
      color: {
        type: "object",
        properties: {
          hue: {
            type: "number",
            description: "Hue value (0.0-1.0)"
          },
          saturation: {
            type: "number",
            description: "Saturation value (0.0-1.0)."
          },
          brightness: {
            type: "number",
            description: "Brightness value (0.0-1.0)"
          },
          kelvin: {
            type: "number",
            description: "Color temperature in Kelvin (1500-9000) (optional, defaults to 3500)"
          }
        },
        required: ["hue", "saturation", "brightness"]
      },
      duration: {
        type: "number",
        description: "Duration of the transition in milliseconds (optional, defaults to 0)"
      }
    },
    required: ["labels", "color"]
  }
};

const TURN_ON_LIGHTS_TOOL: Tool = {
  name: "lifx_lan_turn_on_lights",
  description: "Turn on one or more Lifx lights, optionally at specific color.",
  inputSchema: {
    type: "object",
    properties: {
      labels: {
        type: "array",
        items: { type: "string" },
        description: "The label of one or more Lifx lights to turn on the color for. Array cannot be empty."
      },
      color: {
        type: "object",
        properties: {
          hue: {
            type: "number",
            description: "Hue value (0.0-1.0) (optional, if not existing light color is used)"
          },
          saturation: {
            type: "number",
            description: "Saturation value (0.0-1.0) (optional, if not existing light color is used)"
          },
          brightness: {
            type: "number",
            description: "Brightness value (0.0-1.0) (optional, if not existing light color is used)"
          },
          kelvin: {
            type: "number",
            description: "Color temperature in Kelvin (optional, if not 3500 or previous value is used)"
          }
        }
      },
      duration: {
        type: "number",
        description: "Duration of the transition in milliseconds (optional, defaults to 0)"
      }
    },
    required: ["labels"]
  }
};

const TURN_OFF_LIGHTS_TOOL: Tool = {
  name: "lifx_lan_turn_off_lights",
  description: "Turn off one or more Lifx lights.",
  inputSchema: {
    type: "object",
    properties: {
      labels: {
        type: "array",
        items: { type: "string" },
        description: "The label of one or more Lifx lights to turn off. Array cannot be empty."
      },
      duration: {
        type: "number",
        description: "Duration of the transition in milliseconds (optional, defaults to 0)"
      }
    },
    required: ["labels"]
  }
};

// Server implementation
const server = new Server(
  {
    name: "lifx-lan-mcp",
    version: "1.1.3",
  },
  {
    capabilities: {
      tools: {
        [LIST_LIGHTS_TOOL.name]: LIST_LIGHTS_TOOL,
        [GET_LIGHTS_STATE_TOOL.name]: GET_LIGHTS_STATE_TOOL,
        [SET_LIGHTS_COLOR_TOOL.name]: SET_LIGHTS_COLOR_TOOL,
        [TURN_ON_LIGHTS_TOOL.name]: TURN_ON_LIGHTS_TOOL,
        [TURN_OFF_LIGHTS_TOOL.name]: TURN_OFF_LIGHTS_TOOL,
      },
    },
  },
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    LIST_LIGHTS_TOOL,
    GET_LIGHTS_STATE_TOOL,
    SET_LIGHTS_COLOR_TOOL,
    TURN_ON_LIGHTS_TOOL,
    TURN_OFF_LIGHTS_TOOL,
  ],
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
          content: [{ type: "text", text: `Lights: ${lightsAsString}` }],
          isError: false,
        };
      }

      case GET_LIGHTS_STATE_TOOL.name: {
        const { labels } = args as { labels: string[] };
        const states = await Promise.all(labels.map(label => getLightState(label)));
        const state = Object.fromEntries(labels.map((label, i) => [label, states[i]]));
        const stateAsString = JSON.stringify(state);
        return {
          content: [{ type: "text", text: `Lights ${labels} are in the following states: ${stateAsString}` }],
          isError: false,
        };
      }

      case SET_LIGHTS_COLOR_TOOL.name: {
        const { labels, color, duration = 0 } = args as { 
          labels: string[], 
          color: { hue: number, saturation: number, brightness: number, kelvin?: number },
          duration?: number 
        };
        await Promise.all(labels.map(label => setColorForLight(label, color, duration)));
        return {
          content: [{ type: "text", text: `Successfully set color for lights ${JSON.stringify(labels)}` }],
          isError: false,
        };
      }

      case TURN_ON_LIGHTS_TOOL.name: {
        const { labels, color, duration = 0 } = args as { 
          labels: string[], 
          color?: { hue: number, saturation: number, brightness: number, kelvin?: number },
          duration?: number 
        };
        await Promise.all(labels.map(label => turnOnLight(label, color, duration)));
        return {
          content: [{ type: "text", text: `Successfully turned on lights ${JSON.stringify(labels)}` }],
          isError: false,
        };
      }

      case TURN_OFF_LIGHTS_TOOL.name: {
        const { labels, duration = 0 } = args as { labels: string[], duration?: number };
        await Promise.all(labels.map(label => turnOff(label, duration)));
        return {
          content: [{ type: "text", text: `Successfully turned off lights ${JSON.stringify(labels)}` }],
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