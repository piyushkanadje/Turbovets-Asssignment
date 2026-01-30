import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { UserOrganization } from './entities/user-organization.entity';
import { Task } from './entities/task.entity';

export const entities = [User, Organization, UserOrganization, Task];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  exports: [TypeOrmModule],
})
export class DataModule {}
