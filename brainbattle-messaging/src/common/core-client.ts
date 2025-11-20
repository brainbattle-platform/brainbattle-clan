// src/common/core-client.ts
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class CoreClient {
  private readonly http: AxiosInstance;

  constructor() {
    const baseURL = process.env.CORE_BASE_URL || 'http://bb-core:3001';
    this.http = axios.create({ baseURL, timeout: 2000 });
  }

  async isBlocked(me: string, target: string): Promise<boolean> {
    const res = await this.http.get(
      `/internal/users/${me}/blocked/${target}`,
    );
    return !!res.data?.blocked;
  }

  async isClanMember(userId: string, clanId: string): Promise<boolean> {
    const res = await this.http.get(
      `/internal/clans/${clanId}/members/${userId}`,
    );
    return !!res.data?.member;
  }
}
