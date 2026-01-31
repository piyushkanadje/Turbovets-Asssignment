import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '@task-manager/data';
import { AuthModule } from '@task-manager/auth';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), AuthModule],
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
