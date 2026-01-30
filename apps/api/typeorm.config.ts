import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../../libs/data/src/lib/entities/user.entity';
import { Organization } from '../../libs/data/src/lib/entities/organization.entity';
import { UserOrganization } from '../../libs/data/src/lib/entities/user-organization.entity';
import { Task } from '../../libs/data/src/lib/entities/task.entity';

config({ path: '.env' });

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || 'password123',
  database: process.env.DATABASE_NAME || 'task_db',
  entities: [User, Organization, UserOrganization, Task],
  migrations: ['apps/api/src/migrations/*.ts'],
  migrationsTableName: 'migrations',
});
