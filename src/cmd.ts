import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DEFAULT_CONFIG, ServerConfig } from "./config.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { HttpServer } from "./http-server.js";

/**
 * Returns null if no config was passed, undefined if an invalid config was passed,
 * and an instance of ServerConfig otherwise.
 */
export function parseConfig(args: string[]): ServerConfig | null | undefined {
  if (args.length === 0) {
    return null
  }

  var port: number | undefined = undefined
  var mode: string | undefined = undefined
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--port":
        port = parseInt(args[++i], 10);
        break;
      case "--mode":
        const modeRaw = args[++i];
        if (modeRaw !== 'sse' && modeRaw !== 'stdio') {
          console.error(`Fatal error running server: mode '${modeRaw}' found, 'sse' or 'stdio' expected`);
          return undefined;
        }
        mode = modeRaw;
        break;
    }
  }

  if (mode !== 'sse' && port !== undefined) {
    console.error(`Fatal error running server: mode '${mode}' is incompatible with --port, 'sse' mode expected`);
    return undefined;
  }
  if (mode === undefined || (mode != 'sse' && mode !== 'stdio')) {
    console.error(`Fatal error running server: mode expected, must be one of 'sse' or 'stdio'`);
    return undefined;
  }
  return {
    mode: mode,
    port: port,
  }
}
  
export async function runServer(
  config: ServerConfig = DEFAULT_CONFIG,
  serverBuilder: () => Server,
) {  
  if (config.mode === 'stdio') {
    const transport = new StdioServerTransport();
    await serverBuilder().connect(transport);
    console.log("Lifx LAN MCP Server running on stdio");
  } else if (config.mode === 'sse') {
    console.log("===WARNING===");
    console.log("Running an MCP server over HTTP without authentication is very dangerous. Use at your own risk");
    const httpServer = new HttpServer(config, serverBuilder);
    await httpServer.start()
    console.log(`Lifx LAN MCP Server running on port ${config.port}`);
  } else {
    console.error(`Unexpected mode found - 'sse' or 'stdio' expected`)
  }
}