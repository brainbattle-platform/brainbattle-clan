import { Controller, Get } from '@nestjs/common';
import { importSPKI, exportJWK, JWK } from 'jose';

function fromBase64(b64?: string) {
  return b64 ? Buffer.from(b64, 'base64').toString('utf8') : '';
}

@Controller('.well-known')
export class JwksController {
  @Get('jwks.json')
  async getJwks() {
    const pubB64 = process.env.JWT_PUBLIC_KEY_BASE64;
    const kid = process.env.JWT_KID;

    if (!pubB64) {
      throw new Error('JWT_PUBLIC_KEY_BASE64 not configured');
    }
    if (!kid) {
      throw new Error('JWT_KID not configured');
    }

    const pem = fromBase64(pubB64);

    // importSPKI expects the PEM public key and returns a KeyLike
    const key = await importSPKI(pem, 'RS256');

    // export as JWK and ensure required fields
    const jwk = (await exportJWK(key)) as unknown as Record<string, any>;
    jwk.kty = jwk.kty ?? 'RSA';
    jwk.alg = 'RS256';
    jwk.use = 'sig';
    jwk.kid = kid;

    return { keys: [jwk as JWK] };
  }
}
