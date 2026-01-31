import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, Organization } from '@task-manager/data';
import { AuthModule } from '@task-manager/auth';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskOrgGuard } from './guards/task-org.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Organization]),
    AuthModule,
    AuditModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskOrgGuard],
  exports: [TasksService],
})
export class TasksModule {}
