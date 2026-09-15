import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { ContractRegistryService } from '../config/contract-registry.service';

/**
 * Deliberately minimal — operational visibility only (what's deployed
 * where, is the registry consistent), not a management console. See
 * docs/BACKEND_SCOPE.md: a full enterprise admin suite was explicitly
 * out of scope.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly registry: ContractRegistryService) {}

  @Get('contracts')
  listContracts() {
    return {
      network: this.registry.getNetwork(),
      contracts: this.registry.listAll(),
    };
  }
}
