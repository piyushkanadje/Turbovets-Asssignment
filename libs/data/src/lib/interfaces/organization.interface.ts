export interface IOrganization {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganizationWithHierarchy extends IOrganization {
  parent?: IOrganization | null;
  children?: IOrganization[];
}
