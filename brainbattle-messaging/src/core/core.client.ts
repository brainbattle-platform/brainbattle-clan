// core/core.client.ts (trong brainbattle-messaging)
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CoreClient {
  private readonly base: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    cfg: ConfigService,
  ) {
    this.base = cfg.get<string>('CORE_BASE_URL')!;          // ví dụ http://localhost:3001
    this.apiKey = cfg.get<string>('CORE_INTERNAL_API_KEY')!; // dùng bảo mật nội bộ
  }

  private headers() {
    return { 'x-internal-api-key': this.apiKey };
  }

  async getClanMembership(clanId: string, userId: string) {
    const res = await firstValueFrom(
      this.http.get(`${this.base}/v1/internal/clans/${clanId}/members/${userId}`, {
        headers: this.headers(),
      }),
    );
    return res.data as { isMember: boolean; role?: string; status?: string };
  }

  async checkBlock(a: string, b: string) {
    const res = await firstValueFrom(
      this.http.get(`${this.base}/v1/internal/social/blocks/check`, {
        params: { a, b },
        headers: this.headers(),
      }),
    );
    return res.data as { aBlocksB: boolean; bBlocksA: boolean; anyBlocked: boolean };
  }
}
