import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChallengeRequestDto } from './dto/challenge-request.dto';
import { VerifyChallengeDto } from './dto/verify-challenge.dto';

// Tighter than the app-wide default (120/min, see app.module.ts) —
// challenge/verify are the two endpoints an attacker would actually hammer
// (nonce-guessing, brute-forcing a signature), everything else here just
// inherits the default.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('challenge')
  @Throttle(AUTH_THROTTLE)
  createChallenge(@Body() dto: ChallengeRequestDto) {
    return this.authService.createChallenge(dto.walletAddress);
  }

  @Post('verify')
  @Throttle(AUTH_THROTTLE)
  verify(@Body() dto: VerifyChallengeDto) {
    return this.authService.verifyAndLogin(dto.walletAddress, dto.signature);
  }
}
