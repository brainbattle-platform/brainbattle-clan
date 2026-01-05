import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AccessTokenPayload } from './security.types';
import { createPublicKey } from 'crypto';

type Jwk = { kty: string; kid?: string; use?: string; alg?: string; n?: string; e?: string };
type Jwks = { keys: Jwk[] };

function fromBase64(b64?: string) {
  return b64 ? Buffer.from(b64, 'base64').toString('utf8') : '';
}

@Injectable()
export class JwtVerifier {
  private readonly issuer = process.env.JWT_ISSUER!;
  private readonly audience = process.env.JWT_AUDIENCE!;
  private readonly staticPublicKeyPem = fromBase64(process.env.JWT_PUBLIC_KEY_BASE64);
  private readonly jwksUrl = process.env.AUTH_JWKS_URL;

  // cache
  private jwksCache?: { expiresAt: number; keysByKid: Map<string, string> };
  private jwksFetchPromise?: Promise<void> | null;

  private assertConfigured() {
    if (!this.issuer || !this.audience) {
      throw new UnauthorizedException('JWT verifier misconfigured');
    }
    if (!this.jwksUrl && !this.staticPublicKeyPem) {
      throw new UnauthorizedException('JWT verifier misconfigured');
    }
  }

  private async getPublicKeyPemFromJwks(kid?: string): Promise<string> {
    if (!this.jwksUrl) throw new Error('JWKS not configured');

    const now = Date.now();
    if (!this.jwksCache || this.jwksCache.expiresAt < now) {
      // dedupe concurrent JWKS fetches
      if (!this.jwksFetchPromise) {
        this.jwksFetchPromise = (async () => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            let res: Response;
            try {
              res = await fetch(this.jwksUrl!, { signal: controller.signal });
            } finally {
              clearTimeout(timeout);
            }

            if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
            const jwks = (await res.json()) as Jwks;

            const map = new Map<string, string>();
            let firstPem: string | undefined;
            for (const k of jwks.keys ?? []) {
              if (k.kty !== 'RSA') continue;

              // prefer n/e (JWK) otherwise accept x5c certificate chain
              let pem: string | undefined;
              try {
                if (k.n && k.e) {
                  const publicKey = createPublicKey({ key: k as any, format: 'jwk' });
                  pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
                } else if ((k as any).x5c && (k as any).x5c.length > 0) {
                  const certB64 = (k as any).x5c[0] as string;
                  const certPem = '-----BEGIN CERTIFICATE-----\n' + certB64.match(/.{1,64}/g)?.join('\n') + '\n-----END CERTIFICATE-----\n';
                  const publicKey = createPublicKey({ key: certPem, format: 'pem' });
                  pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
                }
              } catch (err) {
                // skip problematic key
                pem = undefined;
              }

              if (!pem) continue;
              if (!firstPem) firstPem = pem;
              if (k.kid) map.set(k.kid, pem);
            }

            // ensure map has at least one entry so values().next() works
            if (map.size === 0 && typeof firstPem === 'string') {
              map.set('__default__', firstPem);
            }

            // cache 10 minutes
            this.jwksCache = { expiresAt: now + 10 * 60 * 1000, keysByKid: map };
          } catch (err) {
            // keep previous cache if exists; otherwise surface error to callers later
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.warn('[JwtVerifier] JWKS fetch failed:', (err as any)?.message ?? err);
            }
          } finally {
            this.jwksFetchPromise = null;
          }
        })();
      }

      // wait for in-flight fetch to complete
      await this.jwksFetchPromise;

      // if fetch failed and no cache present, fail
      if (!this.jwksCache) throw new Error('JWKS fetch failed and no cached keys');
    }

    // if kid missing, try the first key
    if (!kid) {
      const first = this.jwksCache.keysByKid.values().next().value;
      if (!first) throw new Error('No keys in JWKS');
      return first;
    }

    const pem = this.jwksCache.keysByKid.get(kid) ?? this.jwksCache.keysByKid.get('__default__');
    if (!pem) throw new Error(`Unknown kid: ${kid}`);
    return pem;
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload> {
    this.assertConfigured();

    try {
      const decoded = jwt.decode(token, { complete: true }) as any;
      const header = decoded?.header ?? {};
      const kid = header.kid as string | undefined;
      const alg = header.alg as string | undefined;

      if (alg && alg !== 'RS256') {
        throw new UnauthorizedException('Invalid token algorithm');
      }

      const keyPem = this.jwksUrl
        ? await this.getPublicKeyPemFromJwks(kid)
        : this.staticPublicKeyPem;

      const payload = jwt.verify(token, keyPem, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as AccessTokenPayload;

      if (!payload?.sub) throw new UnauthorizedException('Invalid token payload');
      return payload;
    } catch (e: any) {
      // dev-friendly log
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[JwtVerifier] verify failed:', e?.message ?? e);
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
