import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LinkWalletChallengeDto, LinkWalletVerifyDto } from './dto/link-wallet.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch()
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post('wallets/challenge')
  createLinkChallenge(@CurrentUser() user: JwtPayload, @Body() dto: LinkWalletChallengeDto) {
    return this.usersService.createLinkChallenge(user.sub, dto.address);
  }

  @Post('wallets/verify')
  verifyLinkWallet(@CurrentUser() user: JwtPayload, @Body() dto: LinkWalletVerifyDto) {
    return this.usersService.verifyLinkWallet(user.sub, dto.address, dto.signature);
  }
}
