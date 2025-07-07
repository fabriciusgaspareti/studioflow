"use client";

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export interface Category {
  _id: Id<"categories">;
  name: string;
  description?: string;
  createdAt: number;
  createdBy: Id<"users">;
}

export const useCategories = () => {
  const categories = useQuery(api.categories.getAll) || [];
  const createCategoryMutation = useMutation(api.categories.create);
  const deleteCategoryMutation = useMutation(api.categories.deleteCategory);
  
  const createCategory = async (categoryData: { name: string; description?: string; createdBy: Id<"users"> }) => {
    try {
      const categoryId = await createCategoryMutation(categoryData);
      return categoryId;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (categoryId: Id<"categories">) => {
    try {
      const result = await deleteCategoryMutation({ categoryId });
      return result;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  return {
    categories,
    loading: categories === undefined,
    createCategory,
    deleteCategory
  };
};