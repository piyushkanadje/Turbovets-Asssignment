import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '@task-manager/data';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>
  ) {}

  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId: dto.userId,
      action: dto.action,
      resource: dto.resource,
      organizationId: dto.organizationId || null,
      details: dto.details || null,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async findByOrg(orgId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { organizationId: orgId },
      order: { timestamp: 'DESC' },
      relations: ['user'],
    });
  }
}
