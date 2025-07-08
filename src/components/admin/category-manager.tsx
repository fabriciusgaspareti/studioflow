// ... existing code ...

const handleDeleteCategory = async (categoryId: Id<"categories">) => {
    if (!user?._id) return;
    
    try {
      await deleteCategory(categoryId, user._id);
      toast({
        title: "Sucesso!",
        description: "Categoria excluída. Faixas movidas para 'Uncategorized'.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir categoria.",
        variant: "destructive",
      });
    }
};

// ... existing code ...