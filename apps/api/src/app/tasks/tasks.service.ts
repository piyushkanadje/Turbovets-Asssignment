import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, Organization } from '@task-manager/data';

export interface CreateTaskDto {
  title: string;
  description?: string;
  organizationId: string;
  assigneeId?: string;
  status?: TaskStatus;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: TaskStatus;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>
  ) {}

  async create(dto: CreateTaskDto, createdById: string): Promise<Task> {
    const organization = await this.organizationRepository.findOne({
      where: { id: dto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${dto.organizationId} not found`
      );
    }

    const task = this.taskRepository.create({
      title: dto.title,
      description: dto.description || null,
      organizationId: dto.organizationId,
      assigneeId: dto.assigneeId || createdById,
      status: dto.status || TaskStatus.TODO,
    });

    return this.taskRepository.save(task);
  }

  async findById(id: string): Promise<Task | null> {
    return this.taskRepository.findOne({
      where: { id },
    });
  }

  async findByOrganization(organizationId: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findById(id);

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (dto.title !== undefined) {
      task.title = dto.title;
    }
    if (dto.description !== undefined) {
      task.description = dto.description;
    }
    if (dto.assigneeId !== undefined) {
      task.assigneeId = dto.assigneeId;
    }
    if (dto.status !== undefined) {
      task.status = dto.status;
    }

    return this.taskRepository.save(task);
  }

  async delete(id: string): Promise<void> {
    const task = await this.findById(id);

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    await this.taskRepository.remove(task);
  }
}
