import { Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { envs } from 'src/commons/envs';

@Injectable()
export class MagicLinkService {
  generateMagicLinkToken(sessionId: string, expiresIn: string = '1d'): string {
    return sign({ sessionId }, envs.MAGIC_LINK_SECRET, { expiresIn });
  }

  verifyMagicLinkToken(token: string): { sessionId: string } {
    try {
      return verify(token, envs.MAGIC_LINK_SECRET) as { sessionId: string };
    } catch {
      throw new Error('Token inválido o expirado');
    }
  }
}
