import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChallengeRequestDto } from './dto/challenge-request.dto';
import { VerifyChallengeDto } from './dto/verify-challenge.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('challenge')
  createChallenge(@Body() dto: ChallengeRequestDto) {
    return this.authService.createChallenge(dto.walletAddress);
  }

  @Post('verify')
  verify(@Body() dto: VerifyChallengeDto) {
    return this.authService.verifyAndLogin(dto.walletAddress, dto.signature);
  }
}
