import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../guards/jwt-auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

// Μόνο admin: χωρίς token -> 401, απλός user -> 403.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  // GET /exports/events.xml
  @Get('events.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="events.xml"')
  getXml() {
    return this.exportsService.exportXml();
  }

  // GET /exports/events.json
  @Get('events.json')
  @Header('Content-Disposition', 'attachment; filename="events.json"')
  getJson() {
    return this.exportsService.exportJson();
  }
}
