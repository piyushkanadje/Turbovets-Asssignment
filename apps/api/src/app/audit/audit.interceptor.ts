import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

const MUTATING_METHODS = ['POST', 'PUT', 'DELETE'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only log mutating requests
    if (!MUTATING_METHODS.includes(method)) {
      return next.handle();
    }

    const userId = request.user?.id;
    const resource = request.originalUrl || request.url;
    // Use organizationId set by OrgRolesGuard, fall back to body/query
    const organizationId =
      request.organizationId ||
      request.body?.organizationId ||
      request.query?.organizationId;

    return next.handle().pipe(
      tap({
        next: () => {
          // Log only on successful responses
          if (userId) {
            this.auditService
              .create({
                userId,
                action: method,
                resource,
                organizationId,
                details: {
                  body: this.sanitizeBody(request.body),
                  params: request.params,
                },
              })
              .catch((error) => {
                // Log error but don't fail the request
                console.error('Failed to create audit log:', error);
              });
          }
        },
      })
    );
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body) return {};

    // Remove sensitive fields from audit log
    const sanitized = { ...body };
    delete sanitized['password'];
    delete sanitized['token'];
    return sanitized;
  }
}
