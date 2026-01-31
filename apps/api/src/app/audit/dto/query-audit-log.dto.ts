import { IsUUID } from 'class-validator';

export class QueryAuditLogDto {
  @IsUUID()
  organizationId: string;
}
