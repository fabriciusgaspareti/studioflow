"use client";

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { User } from '@/lib/types';
import { Id } from '../../convex/_generated/dataModel';

export const useUsers = () => {
  const users = useQuery(api.users.getAll) || [];
  const addUserMutation = useMutation(api.users.addUser);
  const deleteUserMutation = useMutation(api.users.deleteUser);
  
  const addUser = async (userData: Omit<User, 'id'>) => {
    try {
      const newUser = await addUserMutation(userData);
      return newUser;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: Id<"users">) => {
    try {
      const result = await deleteUserMutation({ userId });
      return result;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  return {
    users,
    loading: users === undefined,
    error: null,
    addUser,
    deleteUser
  };
};
