import { BitVector } from "../utils/BitVector";
import Long from "long";

export interface HealthInfo {
  status: string;
  version: string;
}

export interface InsertResult {
  success: boolean;
  nodeId: Long;
  message: string;
  aclGrants?: any;
  aclUsers?: any[];
}

export interface SearchResultItem {
  id: Long;
  similarity: number;
  metadata: any;
}

export interface MemoryEntry {
  id: string;
  sessionId: string;
  agentId: string;
  content: string;
  timestamp: Long;
  metadata: { [key: string]: string };
  expiresAt?: Long;
}

export abstract class BaseRiceDBClient {
  protected host: string;
  protected port: number;
  protected connected: boolean = false;

  constructor(host: string = "localhost", port: number = 3000) {
    this.host = host;
    this.port = port;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): void;
  abstract health(): Promise<HealthInfo>;

  abstract login(username: string, password: string): Promise<string>;
  abstract createUser(
    username: string,
    password: string,
    role?: string
  ): Promise<Long>;
  abstract deleteUser(username: string): Promise<boolean>;
  abstract getUser(username: string): Promise<any>;
  abstract listUsers(): Promise<any[]>;

  abstract insert(
    nodeId: Long | number | string,
    text: string,
    metadata: any,
    userId?: Long | number | string,
    sessionId?: string
  ): Promise<InsertResult>;

  abstract search(
    query: string,
    userId: Long | number | string,
    k?: number,
    sessionId?: string,
    filter?: { [key: string]: any }
  ): Promise<SearchResultItem[]>;

  abstract delete(
    nodeId: Long | number | string,
    sessionId?: string
  ): Promise<boolean>;

  // Cortex Session
  abstract createSession(parentSessionId?: string): Promise<string>;
  abstract snapshotSession(sessionId: string, path: string): Promise<boolean>;
  abstract loadSession(path: string): Promise<string>;
  abstract commitSession(
    sessionId: string,
    mergeStrategy?: string
  ): Promise<boolean>;
  abstract dropSession(sessionId: string): Promise<boolean>;

  // SDM
  abstract writeMemory(
    address: BitVector,
    data: BitVector,
    userId?: Long | number | string
  ): Promise<{ success: boolean; message: string }>;
  abstract readMemory(
    address: BitVector,
    userId?: Long | number | string
  ): Promise<BitVector>;

  // Agent Memory
  abstract addMemory(
    sessionId: string,
    agentId: string,
    content: string,
    metadata?: { [key: string]: string },
    ttlSeconds?: number
  ): Promise<{ success: boolean; message: string; entry: MemoryEntry }>;

  abstract getMemory(
    sessionId: string,
    limit?: number,
    after?: number | Long,
    filter?: { [key: string]: string }
  ): Promise<MemoryEntry[]>;

  abstract clearMemory(
    sessionId: string
  ): Promise<{ success: boolean; message: string }>;
  abstract watchMemory(sessionId: string): AsyncIterable<any>;

  // Graph
  abstract addEdge(
    fromNode: Long | number | string,
    toNode: Long | number | string,
    relation: string,
    weight?: number
  ): Promise<boolean>;
  abstract getNeighbors(
    nodeId: Long | number | string,
    relation?: string
  ): Promise<Long[]>;
  abstract traverse(
    startNode: Long | number | string,
    maxDepth?: number
  ): Promise<Long[]>;
  abstract sampleGraph(limit?: number): Promise<any>;

  // PubSub
  abstract subscribe(
    filterType?: string,
    nodeId?: Long | number | string,
    queryText?: string
  ): AsyncIterable<any>;

  abstract batchInsert(
    documents: any[],
    userId?: Long | number | string
  ): Promise<{ count: number; nodeIds: Long[] }>;

  abstract grantPermission(
    nodeId: Long | number | string,
    userId: Long | number | string,
    permissions: { read?: boolean; write?: boolean; delete?: boolean }
  ): Promise<boolean>;
  abstract revokePermission(
    nodeId: Long | number | string,
    userId: Long | number | string
  ): Promise<boolean>;
  abstract checkPermission(
    nodeId: Long | number | string,
    userId: Long | number | string,
    permissionType: string
  ): Promise<boolean>;

  // Helper to convert inputs to Long
  protected toLong(val: Long | number | string): Long {
    return Long.fromValue(val);
  }
}
