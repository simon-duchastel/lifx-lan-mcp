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
  private mcpServerBuilder: () => Server;
  private config: SSEConfig;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  private transportsLegacy: { [sessionId: string]: SSEServerTransport } = {};

  constructor(
    config: SSEConfig,
    mcpServerBuilder: () => Server,
) {
    this.config = config;
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    this.mcpServerBuilder = mcpServerBuilder;

    this.setupRoutes();
  }

  private setupRoutes() {   
    // /sse and /message are the legacy routes, corresponding to the 2024-11-05 protocol version
    this.app.get('/sse', async (req: Request, res: Response) => {
      console.log('Received GET request to /sse (establishing SSE stream)');

      try {
        // Create a new SSE transport for the client
        // The endpoint for POST messages is '/messages'
        const transport = new SSEServerTransport('/messages', res);

        // Store the transport by session ID
        const sessionId = transport.sessionId;
        this.transportsLegacy[sessionId] = transport;

        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
          console.log(`SSE transport closed for session ${sessionId}`);
          delete this.transportsLegacy[sessionId];
        };

        // Connect the transport to a new instance of the MCP server
        const server = this.mcpServerBuilder();
        server.onclose = () => {
          console.log(`MCP server closed for session ${sessionId}`);
        }
        await server.connect(transport);

        // Start the SSE transport to begin streaming
        // This sends an initial 'endpoint' event with the session ID in the URL
        await transport.start();

        console.log(`Established SSE stream with session ID: ${sessionId}`);
      } catch (error) {
        console.error('Error establishing SSE stream:', error);
        if (!res.headersSent) {
          res.status(500).send('Error establishing SSE stream');
        }
      }
    });

    this.app.post('/messages', async (req: Request, res: Response) => {
      console.log('Received POST request to /messages');

      // Extract session ID from URL query parameter
      // In the SSE protocol, this is added by the client based on the endpoint event
      const sessionId = req.query.sessionId as string | undefined;

      if (!sessionId) {
        console.error('No session ID provided in request URL');
        res.status(400).send('Missing sessionId parameter');
        return;
      }

      const transport = this.transportsLegacy[sessionId];
      if (!transport) {
        console.error(`No active transport found for session ID: ${sessionId}`);
        res.status(404).send('Session not found');
        return;
      }

      try {
        // Handle the POST message with the transport
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        console.error('Error handling request:', error);
        if (!res.headersSent) {
          res.status(500).send('Error handling request');
        }
      }
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

        await this.mcpServerBuilder().connect(transport);
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
        console.log(`Listening on ${this.config.port}`)
      });
    });
  }
}