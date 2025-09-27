import { useQuery, useMutation } from "convex/react";
import { api } from "../lib/convex";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "./use-auth";

export const useCategories = () => {
  const { user } = useAuth();
  const categories = useQuery(api.categories.getAll) || [];
  const createCategoryMutation = useMutation(api.categories.create);
  const deleteCategoryMutation = useMutation(api.categories.deleteCategory);
  
  const createCategory = async (category: string) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        throw new Error('No session token found');
      }
      
      const result = await createCategoryMutation({ 
        category,
        sessionToken
      });
      return result;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };
  
  const deleteCategory = async (categoryId: Id<"categories">) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        throw new Error('No session token found');
      }
      
      const result = await deleteCategoryMutation({ 
        categoryId,
        sessionToken
      });
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
    deleteCategory,
  };
}