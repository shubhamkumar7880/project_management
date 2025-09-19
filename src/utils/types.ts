export interface CustomRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}
