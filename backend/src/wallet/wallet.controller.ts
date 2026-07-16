import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('wallet')
@UseGuards(RolesGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  @Roles('driver')
  getBalance(@CurrentUser() user: any) {
    return this.walletService.getBalance(user.id);
  }

  @Post('recharge')
  @Roles('driver')
  recharge(@CurrentUser() user: any, @Body() body: { code: string }) {
    return this.walletService.recharge(user.id, body.code);
  }

  @Get('transactions')
  @Roles('driver')
  getTransactions(@CurrentUser() user: any) {
    return this.walletService.getTransactions(user.id);
  }

  @Post('admin/codes')
  @Roles('admin')
  generateCodes(
    @CurrentUser() user: any,
    @Body() body: { value: number; count: number },
  ) {
    return this.walletService.generateCodes(user.id, body);
  }

  @Get('admin/codes')
  @Roles('admin')
  getAllCodes() {
    return this.walletService.getAllCodes();
  }

  @Get('admin/drivers')
  @Roles('admin')
  getDriverWallets() {
    return this.walletService.getDriverWallets();
  }

  @Post('admin/reward')
  @Roles('admin')
  rewardDriver(
    @CurrentUser() user: any,
    @Body() body: { driverId: string; amount: number; message: string },
  ) {
    return this.walletService.rewardDriver(user.id, body);
  }
}
