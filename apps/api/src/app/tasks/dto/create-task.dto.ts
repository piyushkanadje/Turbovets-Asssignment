import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { TaskStatus } from '@task-manager/data';

export class CreateTaskDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  organizationId: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
