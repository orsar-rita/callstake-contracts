import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { ChallengeStoreService } from '../auth/challenge-store.service';
import { User } from './entities/user.entity';
import { LinkedWallet } from './entities/linked-wallet.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(LinkedWallet) private readonly linkedWallets: Repository<LinkedWallet>,
    private readonly challenges: ChallengeStoreService,
    private readonly authService: AuthService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const wallets = await this.linkedWallets.find({ where: { userId } });
    return {
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: user.displayName,
      bio: user.bio,
      linkedWallets: wallets.map((w) => w.address),
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }
    if (dto.bio !== undefined) {
      user.bio = dto.bio;
    }
    await this.users.save(user);
    return this.getProfile(userId);
  }

  async createLinkChallenge(userId: string, address: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.walletAddress === address) {
      throw new BadRequestException('This address is already your primary account address');
    }
    return this.challenges.issue(address, 'link-wallet');
  }

  async verifyLinkWallet(userId: string, address: string, signatureBase64: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const nonce = await this.challenges.consume(address, 'link-wallet');
    if (!nonce) {
      throw new UnauthorizedException('No pending link challenge for this address — request one first');
    }
    if (!this.authService.verifySignature(address, nonce, signatureBase64)) {
      throw new UnauthorizedException('Signature does not match the issued challenge');
    }

    const alreadyTakenElsewhere = await this.users.findOne({ where: { walletAddress: address } });
    const alreadyLinkedElsewhere = await this.linkedWallets.findOne({ where: { address } });
    if (alreadyTakenElsewhere || alreadyLinkedElsewhere) {
      throw new ConflictException('This address is already linked to an account');
    }

    await this.linkedWallets.save(this.linkedWallets.create({ userId, address }));
    return this.getProfile(userId);
  }
}
