export interface CustomRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
  workspace?: {
    id: string;
    name: string;
    description: string | null;
    workspaceAvatar: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  };
  project?: {
    id: string;
    name: string;
    workspaceId: string;
  };
}
