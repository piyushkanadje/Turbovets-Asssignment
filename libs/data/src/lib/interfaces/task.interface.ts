export interface ITask {
  id: string;
  title: string;
  description: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}
