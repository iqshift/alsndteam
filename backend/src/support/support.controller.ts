import { Controller, Get, Post, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { SupportService } from './support.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('support')
@UseGuards(RolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ─── Driver Routes ───
  @Get('messages')
  @Roles('driver')
  getDriverMessages(@CurrentUser() user: any) {
    return this.supportService.getDriverMessages(user.id);
  }

  @Post('messages')
  @Roles('driver')
  sendDriverMessage(
    @CurrentUser() user: any,
    @Body('content') content: string,
  ) {
    return this.supportService.sendDriverMessage(user.id, content);
  }

  // ─── Admin Routes ───
  @Get('admin/chats')
  @Roles('admin')
  getAdminChats() {
    return this.supportService.getAdminChats();
  }

  @Get('admin/chats/:driverId/messages')
  @Roles('admin')
  getAdminChatMessages(@Param('driverId') driverId: string) {
    return this.supportService.getAdminChatMessages(driverId);
  }

  @Post('admin/chats/:driverId/messages')
  @Roles('admin')
  sendAdminMessage(
    @Param('driverId') driverId: string,
    @Body('content') content: string,
  ) {
    return this.supportService.sendAdminMessage(driverId, content);
  }

  @Delete('admin/chats/:driverId')
  @Roles('admin')
  clearChat(@Param('driverId') driverId: string) {
    return this.supportService.clearChat(driverId);
  }

  // ─── Shared Upload Image Route ───
  @Post('upload')
  @Roles('driver', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const dir = './uploads/support';
          if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
          }
          callback(null, dir);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `support-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadImage(@UploadedFile() file: any) {
    if (!file) {
      return { url: null };
    }
    const path = `/uploads/support/${file.filename}`;
    return { url: path };
  }
}
