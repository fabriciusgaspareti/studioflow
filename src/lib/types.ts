import { Id } from "../../convex/_generated/dataModel";

export interface Track {
  _id: Id<"tracks">;
  _creationTime: number;
  name: string;
  category: string;
  categoryId: Id<"categories">;
  versions: {
    short?: string;
    long?: string;
  };
}

export interface User {
  _id: Id<"users">;
  _creationTime: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export type UserRole = 'user' | 'admin';

export interface Category {
  _id: Id<"categories">;
  _creationTime: number;
  name: string;
}
