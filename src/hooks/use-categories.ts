import { useQuery, useMutation } from "convex/react";
import { api } from "../lib/convex";
import { Id } from "../../convex/_generated/dataModel";

export const useCategories = () => {
  const categories = useQuery(api.categories.getAll) || [];
  const createCategoryMutation = useMutation(api.categories.create);
  const deleteCategoryMutation = useMutation(api.categories.deleteCategory);
  
  const createCategory = async (category: string) => {
    try {
      const result = await createCategoryMutation({ category });
      return result;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };
  
  const deleteCategory = async (categoryId: Id<"categories">, createdBy: Id<"users">) => {
    try {
      const result = await deleteCategoryMutation({ categoryId, createdBy });
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