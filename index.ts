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

const GET_LIGHT_STATE_TOOL: Tool = {
  name: "lifx_lan_get_light_state",
  description: "Get the current state of a specific LIFX light, including its color, whether it's " +
  "on or off, and other properties.",
  inputSchema: {
    type: "object",
    properties: {
      label: {
        type: "string",
        description: "The label of the Lifx light to get the state for"
      }
    },
    required: ["label"]
  }
};

const SET_LIGHT_COLOR_TOOL: Tool = {
  name: "lifx_lan_set_light_color",
  description: "Set the color of a specific Lifx light. Must specify hue, saturation, brightness, " +
  "and may optionally specify kelvin temperature (otherwise 3500 is used).",
  inputSchema: {
    type: "object",
    properties: {
      label: {
        type: "string",
        description: "The label of the Lifx light to set the color for"
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
    required: ["label", "color"]
  }
};

const TURN_ON_LIGHT_TOOL: Tool = {
  name: "lifx_lan_turn_on_light",
  description: "Turn on a specific Lifx light, optionally at specific color.",
  inputSchema: {
    type: "object",
    properties: {
      label: {
        type: "string",
        description: "The label of the Lifx light to turn on"
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
        },
        required: ["hue", "saturation", "brightness"]
      },
      duration: {
        type: "number",
        description: "Duration of the transition in milliseconds (optional, defaults to 0)"
      }
    },
    required: ["label"]
  }
};

const TURN_OFF_LIGHT_TOOL: Tool = {
  name: "lifx_lan_turn_off_light",
  description: "Turn off a specific Lifx light.",
  inputSchema: {
    type: "object",
    properties: {
      label: {
        type: "string",
        description: "The label of the Lifx light to turn off"
      },
      duration: {
        type: "number",
        description: "Duration of the transition in milliseconds (optional, defaults to 0)"
      }
    },
    required: ["label"]
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
      tools: {
        [LIST_LIGHTS_TOOL.name]: LIST_LIGHTS_TOOL,
        [GET_LIGHT_STATE_TOOL.name]: GET_LIGHT_STATE_TOOL,
        [SET_LIGHT_COLOR_TOOL.name]: SET_LIGHT_COLOR_TOOL,
        [TURN_ON_LIGHT_TOOL.name]: TURN_ON_LIGHT_TOOL,
        [TURN_OFF_LIGHT_TOOL.name]: TURN_OFF_LIGHT_TOOL,
      },
    },
  },
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    LIST_LIGHTS_TOOL,
    GET_LIGHT_STATE_TOOL,
    SET_LIGHT_COLOR_TOOL,
    TURN_ON_LIGHT_TOOL,
    TURN_OFF_LIGHT_TOOL,
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

      case GET_LIGHT_STATE_TOOL.name: {
        const { label } = args as { label: string };
        const state = await getLightState(label);
        const stateAsString = JSON.stringify(state);
        return {
          content: [{ type: "text", text: `Light ${label} has state: ${stateAsString}` }],
          isError: false,
        };
      }

      case SET_LIGHT_COLOR_TOOL.name: {
        const { label, color, duration = 0 } = args as { 
          label: string, 
          color: { hue: number, saturation: number, brightness: number, kelvin?: number },
          duration?: number 
        };
        await setColorForLight(label, color, duration);
        return {
          content: [{ type: "text", text: `Successfully set color for light ${label}` }],
          isError: false,
        };
      }

      case TURN_ON_LIGHT_TOOL.name: {
        const { label, color, duration = 0 } = args as { 
          label: string, 
          color?: { hue: number, saturation: number, brightness: number, kelvin?: number },
          duration?: number 
        };
        await turnOnLight(label, color, duration);
        return {
          content: [{ type: "text", text: `Successfully turned on light ${label}` }],
          isError: false,
        };
      }

      case TURN_OFF_LIGHT_TOOL.name: {
        const { label, duration = 0 } = args as { label: string, duration?: number };
        await turnOff(label, duration);
        return {
          content: [{ type: "text", text: `Successfully turned off light ${label}` }],
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