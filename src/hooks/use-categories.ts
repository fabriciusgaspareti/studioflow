// ... existing code ...

export const useCategories = () => {
  const categories = useQuery(api.categories.getAll) || [];
  const createCategoryMutation = useMutation(api.categories.create);
  const deleteCategoryMutation = useMutation(api.categories.deleteCategory);
  
  // ... existing createCategory function ...
  
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