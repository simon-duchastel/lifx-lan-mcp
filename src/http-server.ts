import express, { Request, Response } from "express";
import cors from "cors";
import { SSEConfig } from "./config.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export class HttpServer {
  private app: express.Application;
  private mcpServer: Server;
  private config: SSEConfig;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  private transportsLegacy: { [sessionId: string]: SSEServerTransport } = {};

  constructor(
    config: SSEConfig,
    mcpServer: Server,
) {
    this.config = config;
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    this.mcpServer = mcpServer;

    this.setupRoutes(mcpServer);
  }

  private setupRoutes(mcpServer: Server) {
    // /sse and /message are the legacy routes, corresponding to the 2024-11-05 protocol version
    this.app.get('/sse', async (req: Request, res: Response) => {
      const transport: SSEServerTransport = new SSEServerTransport('/message', res);
      this.transportsLegacy[transport.sessionId] = transport;

      transport.onerror = (error: Error) => {
        console.log(`Error: ${error}`)
      };

      await mcpServer.connect(transport);
      console.log(`Opened connection for ${transport.sessionId}`)
    });
    this.app.post('/message', async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      const transport: SSEServerTransport = this.transportsLegacy[sessionId];

      transport.onerror = (error: Error) => {
        console.error(`Error: ${error}`)
      };
      transport.onclose = () => {
        delete this.transportsLegacy[sessionId]
        console.log(`Closed connection for ${sessionId}`)
      }
  
      await transport.handlePostMessage(req, res, req.body);
    });

    // /mcp is the latest route as of 2025-04-21, corresponding to the 2025-03-26 protocol version
    this.app.post('/mcp', async (req: Request, res: Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      // re-use the existing transport if it exists
      if (sessionId && this.transports[sessionId]) {
        transport = this.transports[sessionId];
      } else if (!sessionId && this.isInitializeRequest(req.body)) {
        const eventStore = new InMemoryEventStore();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          eventStore,
          onsessioninitialized: (sessionId) => {
            this.transports[sessionId] = transport;
          },
        });

        transport.onerror = (error: Error) => {
          console.log(`Error: ${error}`)
        };

        transport.onclose = () => {
          if (transport.sessionId) {
            delete this.transports[transport.sessionId];
          }
        };

        await mcpServer.connect(transport);
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }
      
      await transport.handleRequest(req, res, req.body);
    });

    // Reusable handler for GET and DELETE requests
    const handleSessionRequest = async (req: Request, res: Response) => {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId || !this.transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      
      const transport = this.transports[sessionId];
      await transport.handleRequest(req, res);
    };

    // Handle GET requests for server-to-client notifications via SSE
    this.app.get('/mcp', handleSessionRequest);

    // Handle DELETE requests for session termination
    this.app.delete('/mcp', handleSessionRequest);
  }

  private isInitializeRequest(body: any): boolean {
    return body && body.jsonrpc === '2.0' && body.method === 'initialize';
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => {
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (this.mcpServer) {
      this.mcpServer.close();
    }
  }
} 