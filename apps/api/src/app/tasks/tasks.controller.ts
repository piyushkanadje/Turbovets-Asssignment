import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskOrgGuard } from './guards/task-org.guard';
import {
  JwtAuthGuard,
  OrgRolesGuard,
  OrgRoles,
} from '@task-manager/auth';
import { OrganizationRole } from '@task-manager/data';
import { AuditInterceptor } from '../audit/audit.interceptor';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
  organizationId?: string;
  userOrgRole?: OrganizationRole;
}

@Controller('tasks')
@UseInterceptors(AuditInterceptor)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.ADMIN)
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.tasksService.create(createTaskDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.VIEWER)
  async findAll(@Query('organizationId') organizationId: string) {
    return this.tasksService.findByOrganization(organizationId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, TaskOrgGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.VIEWER)
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: AuthenticatedRequest
  ) {
    if (req.userOrgRole === OrganizationRole.VIEWER) {
      const allowedKeys = ['status'];
      const updateKeys = Object.keys(updateTaskDto).filter(
        (k) => updateTaskDto[k as keyof UpdateTaskDto] !== undefined
      );

      if (updateKeys.some((k) => !allowedKeys.includes(k))) {
        throw new ForbiddenException('Viewers can only update task status');
      }
    }

    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TaskOrgGuard, OrgRolesGuard)
  @OrgRoles(OrganizationRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.tasksService.delete(id);
    return { message: 'Task deleted successfully' };
  }
}
