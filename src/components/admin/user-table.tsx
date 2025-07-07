"use client";

import { useState } from 'react';
import { useUsers } from '@/hooks/use-users';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserPlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import type { User, UserRole } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Id } from '../../../convex/_generated/dataModel';

export function UserTable() {
    const { toast } = useToast();
    const { users, loading, addUser, deleteUser } = useUsers();
    const [isAddUserOpen, setAddUserOpen] = useState(false);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<{ id: Id<"users">, name: string } | null>(null);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' as UserRole, password: ''});

    // Contar quantos administradores existem
    const adminCount = users.filter(user => user.role === 'admin').length;

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newUser.name || !newUser.email || !newUser.password) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Nome, e-mail e senha são obrigatórios.' });
            return;
        }
        
        try {
            const userPayload: Omit<User, 'id'> = {
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                password: newUser.password
            };
            
            const userAdded = await addUser(userPayload);

            if (userAdded) {
                toast({ title: 'Sucesso!', description: `Usuário "${userAdded.name}" criado.` });
                setNewUser({ name: '', email: '', role: 'user', password: '' });
                setAddUserOpen(false);
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao criar usuário.' });
            }

        } catch (error: any) {
            console.error("Error creating user:", error);
            toast({ variant: 'destructive', title: 'Erro ao Criar Usuário', description: error.message || 'Não foi possível criar o usuário.' });
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        
        try {
            const result = await deleteUser(userToDelete.id);
            if (result.success) {
                toast({ 
                    title: 'Usuário Excluído', 
                    description: `O usuário "${userToDelete.name}" foi excluído com sucesso.` 
                });
            }
        } catch (error: any) {
            console.error("Error deleting user:", error);
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao Excluir Usuário', 
                description: error.message || 'Não foi possível excluir o usuário.' 
            });
        } finally {
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    const canDeleteUser = (user: any) => {
        // Se não é admin, pode excluir
        if (user.role !== 'admin') return true;
        // Se é admin, só pode excluir se houver mais de 1 admin
        return adminCount > 1;
    };

    const openDeleteDialog = (userId: Id<"users">, userName: string) => {
        setUserToDelete({ id: userId, name: userName });
        setDeleteDialogOpen(true);
    };

    const renderTableContent = () => {
        if (loading) {
            return Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-10 w-10" /></TableCell>
                </TableRow>
            ));
        }

        if (users.length === 0) {
            return (
                 <TableRow key="empty-state">
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        Nenhum usuário encontrado. Adicione o primeiro usuário.
                    </TableCell>
                </TableRow>
            );
        }

        return users.map((user, index) => {
            const canDelete = canDeleteUser(user);
            
            return (
                <TableRow key={user._id || `user-${index}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                    <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                               <span tabIndex={0}>
                                    <Button 
                                        variant="destructive" 
                                        size="icon" 
                                        disabled={!canDelete}
                                        onClick={() => canDelete && openDeleteDialog(user._id, user.name)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Excluir</span>
                                    </Button>
                               </span>
                            </TooltipTrigger>
                            <TooltipContent>
                               {canDelete ? (
                                   <p>Excluir usuário</p>
                               ) : (
                                   <div>
                                       <p>Não é possível excluir o último administrador</p>
                                       <p>Crie outro administrador primeiro</p>
                                   </div>
                               )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    </TableCell>
                </TableRow>
            );
        });
    };

    return (
        <>
            <Card>
                <CardHeader className="px-10 py-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1.5">
                            <CardTitle>Usuários</CardTitle>
                            <CardDescription>Gerencie os usuários do seu aplicativo. Adicione ou remova usuários.</CardDescription>
                        </div>
                        <Button onClick={() => setAddUserOpen(true)} className="w-full sm:w-auto">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Adicionar Usuário
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderTableContent()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add User Dialog */}
            <Dialog open={isAddUserOpen} onOpenChange={setAddUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                        <DialogDescription>
                           Insira os detalhes e a senha inicial para o novo usuário.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddUser} id="add-user-form" className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="user-name">Nome</Label>
                            <Input id="user-name" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} placeholder="João Silva" />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="user-email">E-mail</Label>
                            <Input id="user-email" type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder="joao@exemplo.com" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-password">Senha</Label>
                            <Input id="user-password" type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} placeholder="••••••••" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-role">Função</Label>
                             <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({...newUser, role: value})}>
                                <SelectTrigger id="user-role">
                                    <SelectValue placeholder="Selecione uma função" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">Usuário</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </form>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" form="add-user-form">Adicionar Usuário</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza de que deseja excluir o usuário "{userToDelete?.name}"? 
                            Esta ação não pode ser desfeita e todas as sessões do usuário serão encerradas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteUser}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir Usuário
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
