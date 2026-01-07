import axios, { AxiosInstance } from "axios";
import {
  BaseRiceDBClient,
  HealthInfo,
  InsertResult,
  SearchResultItem,
  MemoryEntry,
} from "./BaseClient";
import Long from "long";
import { BitVector } from "../utils/BitVector";

export class HttpClient extends BaseRiceDBClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(host: string = "localhost", port: number = 3000) {
    super(host, port);
    this.client = axios.create({
      baseURL: `http://${host}:${port}`,
      timeout: 30000,
      validateStatus: () => true, // Handle status codes manually
    });
  }

  async connect(): Promise<boolean> {
    try {
      const res = await this.client.get("/health");
      this.connected = res.status === 200;
      return this.connected;
    } catch (e) {
      this.connected = false;
      throw e;
    }
  }

  disconnect(): void {
    this.connected = false;
  }

  private setAuthHeader() {
    if (this.token) {
      this.client.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${this.token}`;
    }
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    params?: any
  ): Promise<T> {
    const res = await this.client.request({
      method,
      url,
      data,
      params,
    });

    if (res.status >= 400) {
      throw new Error(
        `Request failed with status ${res.status}: ${JSON.stringify(res.data)}`
      );
    }
    return res.data;
  }

  async health(): Promise<HealthInfo> {
    return this.request<HealthInfo>("GET", "/health");
  }

  async login(username: string, password: string): Promise<string> {
    const res = await this.request<{
      token: string;
      user_id: number;
      role: string;
    }>("POST", "/auth/login", { username, password });
    this.token = res.token;
    this.setAuthHeader();
    return this.token!;
  }

  async createUser(
    username: string,
    password: string,
    role: string = "user"
  ): Promise<Long> {
    const res = await this.request<{ user_id: number }>(
      "POST",
      "/auth/create_user",
      { username, password, role }
    );
    return Long.fromNumber(res.user_id);
  }

  async deleteUser(username: string): Promise<boolean> {
    await this.request("DELETE", "/auth/delete_user", { username });
    return true;
  }

  async getUser(username: string): Promise<any> {
    return this.request("GET", `/auth/users/${username}`);
  }

  async listUsers(): Promise<any[]> {
    return this.request("GET", "/auth/users");
  }

  async insert(
    nodeId: Long | number | string,
    text: string,
    metadata: any,
    userId: Long | number | string = 1,
    sessionId?: string
  ): Promise<InsertResult> {
    const payload: any = {
      id: this.toLong(nodeId).toNumber(),
      text,
      metadata,
      user_id: this.toLong(userId).toNumber(),
    };
    if (sessionId) payload.session_id = sessionId;

    const res = await this.request<any>("POST", "/insert", payload);
    if (!res.success) {
      throw new Error(res.message || "Insert failed");
    }
    return {
      success: res.success,
      nodeId: Long.fromValue(res.node_id),
      message: res.message,
    };
  }

  async search(
    query: string,
    userId: Long | number | string,
    k: number = 10,
    sessionId?: string,
    filter?: { [key: string]: any }
  ): Promise<SearchResultItem[]> {
    const payload: any = {
      query,
      user_id: this.toLong(userId).toNumber(),
      k,
    };
    if (sessionId) payload.session_id = sessionId;
    if (filter) payload.filter = filter;

    const res = await this.request<any>("POST", "/search", payload);
    const results = Array.isArray(res) ? res : res.results || [];

    return results.map((r: any) => ({
      id: Long.fromValue(r.id),
      similarity: r.similarity,
      metadata: r.metadata,
    }));
  }

  async delete(
    nodeId: Long | number | string,
    sessionId?: string
  ): Promise<boolean> {
    const params: any = {};
    if (sessionId) params.session_id = sessionId;

    await this.request(
      "DELETE",
      `/node/${this.toLong(nodeId).toString()}`,
      undefined,
      params
    );
    return true;
  }

  // Cortex
  async createSession(parentSessionId?: string): Promise<string> {
    const payload: any = {};
    if (parentSessionId) payload.parent_session_id = parentSessionId;
    const res = await this.request<any>("POST", "/session/create", payload);
    return res.session_id;
  }

  async snapshotSession(sessionId: string, path: string): Promise<boolean> {
    await this.request("POST", `/session/${sessionId}/snapshot`, { path });
    return true;
  }

  async loadSession(path: string): Promise<string> {
    const res = await this.request<any>("POST", "/session/load", { path });
    return res.session_id;
  }

  async commitSession(
    sessionId: string,
    mergeStrategy: string = "overwrite"
  ): Promise<boolean> {
    await this.request("POST", `/session/${sessionId}/commit`, {
      merge_strategy: mergeStrategy,
    });
    return true;
  }

  async dropSession(sessionId: string): Promise<boolean> {
    await this.request("DELETE", `/session/${sessionId}/drop`);
    return true;
  }

  // SDM
  async writeMemory(
    address: BitVector,
    data: BitVector,
    userId: Long | number | string = 1
  ): Promise<{ success: boolean; message: string }> {
    const res = await this.request<any>("POST", "/sdm/write", {
      address: address.toList().map((l) => l.toNumber()),
      data: data.toList().map((l) => l.toNumber()),
      user_id: this.toLong(userId).toNumber(),
    });
    return { success: res.success, message: res.message };
  }

  async readMemory(
    address: BitVector,
    userId: Long | number | string = 1
  ): Promise<BitVector> {
    const res = await this.request<any>("POST", "/sdm/read", {
      address: address.toList().map((l) => l.toNumber()),
      user_id: this.toLong(userId).toNumber(),
    });
    // Assuming res.data is list of numbers
    return new BitVector(res.data.map((n: number) => Long.fromNumber(n)));
  }

  // Agent Memory
  async addMemory(
    sessionId: string,
    agentId: string,
    content: string,
    metadata: { [key: string]: string } = {},
    ttlSeconds?: number
  ): Promise<{ success: boolean; message: string; entry: MemoryEntry }> {
    const payload: any = {
      agent_id: agentId,
      content,
      metadata,
    };
    if (ttlSeconds !== undefined) payload.ttl_seconds = ttlSeconds;

    const res = await this.request<any>(
      "POST",
      `/memory/${sessionId}`,
      payload
    );
    return {
      success: res.success,
      message: res.message,
      entry: {
        ...res.entry,
        timestamp: Long.fromValue(res.entry.timestamp),
        expiresAt: res.entry.expires_at
          ? Long.fromValue(res.entry.expires_at)
          : undefined,
      },
    };
  }

  async getMemory(
    sessionId: string,
    limit: number = 50,
    after: number | Long = 0,
    filter: { [key: string]: string } = {}
  ): Promise<MemoryEntry[]> {
    const params: any = { limit };
    if (after) params.after_timestamp = Long.fromValue(after).toNumber();

    const res = await this.request<any>(
      "GET",
      `/memory/${sessionId}`,
      undefined,
      params
    );
    const entries = res.entries || [];
    return entries.map((e: any) => ({
      ...e,
      timestamp: Long.fromValue(e.timestamp),
      expiresAt: e.expires_at ? Long.fromValue(e.expires_at) : undefined,
    }));
  }

  async clearMemory(
    sessionId: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await this.request<any>("DELETE", `/memory/${sessionId}`);
    return { success: res.success, message: res.message || "" };
  }

  async *watchMemory(sessionId: string): AsyncIterable<any> {
    throw new Error(
      "Watch memory is not supported via HTTP transport. Use gRPC."
    );
  }

  // Graph
  async addEdge(
    fromNode: Long | number | string,
    toNode: Long | number | string,
    relation: string,
    weight: number = 1.0
  ): Promise<boolean> {
    await this.request("POST", "/graph/edge", {
      from: this.toLong(fromNode).toNumber(),
      to: this.toLong(toNode).toNumber(),
      relation,
      weight,
    });
    return true;
  }

  async getNeighbors(
    nodeId: Long | number | string,
    relation?: string
  ): Promise<Long[]> {
    const payload: any = { node_id: this.toLong(nodeId).toNumber() };
    if (relation) payload.relation = relation;

    const res = await this.request<any>("POST", "/graph/neighbors", payload);
    return (res.neighbors || []).map((id: number) => Long.fromNumber(id));
  }

  async traverse(
    startNode: Long | number | string,
    maxDepth: number = 1
  ): Promise<Long[]> {
    const res = await this.request<any>("POST", "/graph/traverse", {
      start: this.toLong(startNode).toNumber(),
      max_depth: maxDepth,
    });
    return (res.visited || []).map((id: number) => Long.fromNumber(id));
  }

  async sampleGraph(limit: number = 100): Promise<any> {
    return this.request("POST", "/graph/sample", { limit });
  }

  async *subscribe(
    filterType: string = "all",
    nodeId?: Long | number | string,
    queryText: string = ""
  ): AsyncIterable<any> {
    throw new Error("Subscribe is not supported via HTTP transport. Use gRPC.");
  }

  async batchInsert(
    documents: any[],
    userId: Long | number | string = 1
  ): Promise<{ count: number; nodeIds: Long[] }> {
    const payload = documents.map((doc) => ({
      id: this.toLong(doc.id).toNumber(),
      text: doc.text || "",
      metadata: doc.metadata,
      user_id:
        doc.userId !== undefined
          ? this.toLong(doc.userId).toNumber()
          : this.toLong(userId).toNumber(),
    }));

    const res = await this.request<any>("POST", "/batch_insert", payload);
    return {
      count: res.count,
      nodeIds: (res.node_ids || []).map((id: number) => Long.fromNumber(id)),
    };
  }

  async grantPermission(
    nodeId: Long | number | string,
    userId: Long | number | string,
    permissions: { read?: boolean; write?: boolean; delete?: boolean }
  ): Promise<boolean> {
    await this.request("POST", "/acl/grant", {
      node_id: this.toLong(nodeId).toNumber(),
      target_user_id: this.toLong(userId).toNumber(),
      permissions,
    });
    return true;
  }

  async revokePermission(
    nodeId: Long | number | string,
    userId: Long | number | string
  ): Promise<boolean> {
    await this.request("POST", "/acl/revoke", {
      node_id: this.toLong(nodeId).toNumber(),
      target_user_id: this.toLong(userId).toNumber(),
    });
    return true;
  }

  async checkPermission(
    nodeId: Long | number | string,
    userId: Long | number | string,
    permissionType: string
  ): Promise<boolean> {
    const res = await this.request<any>("POST", "/acl/check", {
      node_id: this.toLong(nodeId).toNumber(),
      user_id: this.toLong(userId).toNumber(),
      permission_type: permissionType,
    });
    return res.allowed || false;
  }
}
