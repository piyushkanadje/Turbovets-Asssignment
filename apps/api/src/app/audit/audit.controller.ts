import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { JwtAuthGuard, OrgRolesGuard, OrgRoles } from '@task-manager/auth';
import { OrganizationRole } from '@task-manager/data';

@Controller('audit-log')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async findAll(@Query() query: QueryAuditLogDto) {
    return this.auditService.findByOrg(query.organizationId);
  }
}
