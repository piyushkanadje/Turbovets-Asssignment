import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class CreateAuditLogDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MaxLength(10)
  action: string;

  @IsString()
  @MaxLength(255)
  resource: string;

  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsOptional()
  details?: Record<string, unknown>;
}
