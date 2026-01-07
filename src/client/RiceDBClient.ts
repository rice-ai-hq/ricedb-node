import {
  BaseRiceDBClient,
  HealthInfo,
  InsertResult,
  SearchResultItem,
  MemoryEntry,
} from "./BaseClient";
import { GrpcClient } from "./GrpcClient";
import { HttpClient } from "./HttpClient";
import Long from "long";
import { BitVector } from "../utils/BitVector";

export class RiceDBClient extends BaseRiceDBClient {
  private client: BaseRiceDBClient | null = null;
  private transport: "grpc" | "http" | "auto";
  private _grpcPort: number;
  private _httpPort: number;

  constructor(
    host: string = "localhost",
    transport: "grpc" | "http" | "auto" = "auto",
    grpcPort: number = 50051,
    httpPort: number = 3000
  ) {
    super(host, 0);
    this.transport = transport;
    this._grpcPort = grpcPort;
    this._httpPort = httpPort;
  }

  async connect(): Promise<boolean> {
    if (this.transport === "grpc") {
      this.client = new GrpcClient(this.host, this._grpcPort);
      await this.client.connect();
      this.connected = true;
      return true;
    } else if (this.transport === "http") {
      this.client = new HttpClient(this.host, this._httpPort);
      await this.client.connect();
      this.connected = true;
      return true;
    } else {
      // Auto
      try {
        const grpcClient = new GrpcClient(this.host, this._grpcPort);
        await grpcClient.connect();
        this.client = grpcClient;
        this.connected = true;
        return true;
      } catch (e) {
        // Fallback
        console.warn("gRPC connection failed, falling back to HTTP");
        this.client = new HttpClient(this.host, this._httpPort);
        await this.client.connect();
        this.connected = true;
        return true;
      }
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    this.connected = false;
  }

  private checkConnected() {
    if (!this.client) throw new Error("Not connected");
  }

  async health(): Promise<HealthInfo> {
    this.checkConnected();
    return this.client!.health();
  }

  async login(username: string, password: string): Promise<string> {
    this.checkConnected();
    return this.client!.login(username, password);
  }

  async createUser(
    username: string,
    password: string,
    role?: string
  ): Promise<Long> {
    this.checkConnected();
    return this.client!.createUser(username, password, role);
  }

  async deleteUser(username: string): Promise<boolean> {
    this.checkConnected();
    return this.client!.deleteUser(username);
  }

  async getUser(username: string): Promise<any> {
    this.checkConnected();
    return this.client!.getUser(username);
  }

  async listUsers(): Promise<any[]> {
    this.checkConnected();
    return this.client!.listUsers();
  }

  async insert(
    nodeId: Long | number | string,
    text: string,
    metadata: any,
    userId: Long | number | string = 1,
    sessionId?: string
  ): Promise<InsertResult> {
    this.checkConnected();
    return this.client!.insert(nodeId, text, metadata, userId, sessionId);
  }

  async search(
    query: string,
    userId: Long | number | string,
    k: number = 10,
    sessionId?: string,
    filter?: { [key: string]: any }
  ): Promise<SearchResultItem[]> {
    this.checkConnected();
    return this.client!.search(query, userId, k, sessionId, filter);
  }

  async delete(
    nodeId: Long | number | string,
    sessionId?: string
  ): Promise<boolean> {
    this.checkConnected();
    return this.client!.delete(nodeId, sessionId);
  }

  async createSession(parentSessionId?: string): Promise<string> {
    this.checkConnected();
    return this.client!.createSession(parentSessionId);
  }

  async snapshotSession(sessionId: string, path: string): Promise<boolean> {
    this.checkConnected();
    return this.client!.snapshotSession(sessionId, path);
  }

  async loadSession(path: string): Promise<string> {
    this.checkConnected();
    return this.client!.loadSession(path);
  }

  async commitSession(
    sessionId: string,
    mergeStrategy: string = "overwrite"
  ): Promise<boolean> {
    this.checkConnected();
    return this.client!.commitSession(sessionId, mergeStrategy);
  }

  async dropSession(sessionId: string): Promise<boolean> {
    this.checkConnected();
    return this.client!.dropSession(sessionId);
  }

  async writeMemory(
    address: BitVector,
    data: BitVector,
    userId: Long | number | string = 1
  ): Promise<{ success: boolean; message: string }> {
    this.checkConnected();
    return this.client!.writeMemory(address, data, userId);
  }

  async readMemory(
    address: BitVector,
    userId: Long | number | string = 1
  ): Promise<BitVector> {
    this.checkConnected();
    return this.client!.readMemory(address, userId);
  }

  async addMemory(
    sessionId: string,
    agentId: string,
    content: string,
    metadata: { [key: string]: string } = {},
    ttlSeconds?: number
  ): Promise<{ success: boolean; message: string; entry: MemoryEntry }> {
    this.checkConnected();
    return this.client!.addMemory(
      sessionId,
      agentId,
      content,
      metadata,
      ttlSeconds
    );
  }

  async getMemory(
    sessionId: string,
    limit: number = 50,
    after: number | Long = 0,
    filter: { [key: string]: string } = {}
  ): Promise<MemoryEntry[]> {
    this.checkConnected();
    return this.client!.getMemory(sessionId, limit, after, filter);
  }

  async clearMemory(
    sessionId: string
  ): Promise<{ success: boolean; message: string }> {
    this.checkConnected();
    return this.client!.clearMemory(sessionId);
  }

  async *watchMemory(sessionId: string): AsyncIterable<any> {
    this.checkConnected();
    yield* this.client!.watchMemory(sessionId);
  }

  async addEdge(
    fromNode: Long | number | string,
    toNode: Long | number | string,
    relation: string,
    weight: number = 1.0
  ): Promise<boolean> {
    this.checkConnected();
    return this.client!.addEdge(fromNode, toNode, relation, weight);
  }

  async getNeighbors(
    nodeId: Long | number | string,
    relation?: string
  ): Promise<Long[]> {
    this.checkConnected();
    return this.client!.getNeighbors(nodeId, relation);
  }

  async traverse(
    startNode: Long | number | string,
    maxDepth: number = 1
  ): Promise<Long[]> {
    this.checkConnected();
    return this.client!.traverse(startNode, maxDepth);
  }

  async sampleGraph(limit: number = 100): Promise<any> {
    this.checkConnected();
    return this.client!.sampleGraph(limit);
  }

  async *subscribe(
    filterType: string = "all",
    nodeId?: Long | number | string,
    queryText: string = ""
  ): AsyncIterable<any> {
    this.checkConnected();
    yield* this.client!.subscribe(filterType, nodeId, queryText);
  }

  async batchInsert(
    documents: any[],
    userId: Long | number | string = 1
  ): Promise<{ count: number; nodeIds: Long[] }> {
    this.checkConnected();
    return this.client!.batchInsert(documents, userId);
  }

  async grantPermission(
    nodeId: Long | number | string,
    userId: Long | number | string,
    permissions: { read?: boolean; write?: boolean; delete?: boolean }
  ): Promise<boolean> {
    this.checkConnected();
    return this.client!.grantPermission(nodeId, userId, permissions);
  }

  async revokePermission(
    nodeId: Long | number | string,
    userId: Long | number | string
  ): Promise<boolean> {
    this.checkConnected();
    return this.client!.revokePermission(nodeId, userId);
  }

  async checkPermission(
    nodeId: Long | number | string,
    userId: Long | number | string,
    permissionType: string
  ): Promise<boolean> {
    this.checkConnected();
    return this.client!.checkPermission(nodeId, userId, permissionType);
  }

  // Helper to convert inputs to Long
  protected toLong(val: Long | number | string): Long {
    return Long.fromValue(val);
  }
}
