import { useEffect, useState } from "react";
import { client } from "@/lib/directus";
import { readUsers, deleteUser } from "@directus/sdk";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DirectusUser {
  id: string;
  first_name?: string; // Usamos este campo para o Nome do Estabelecimento
  email?: string;
  role?: {
    id: string;
    name: string;
  } | null;
}

export const UsersList = () => {
  const [users, setUsers] = useState<DirectusUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      // Buscamos usuários e pedimos para expandir o campo 'role' para pegar o nome dela
      const result = await client.request(readUsers({
        fields: ['id', 'first_name', 'email', 'role.name'],
        sort: ['-date_created'] // Mais recentes primeiro
      }));

      setUsers(result as DirectusUser[]);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar lista de usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    try {
      await client.request(deleteUser(userId));

      toast.success("Usuário removido com sucesso");
      
      // Atualiza a lista removendo o item localmente para ser mais rápido
      setUsers(current => current.filter(u => u.id !== userId));
    } catch (error: any) {
      console.error("Erro ao deletar usuário:", error);
      const msg = error?.errors?.[0]?.message || "Erro desconhecido";
      toast.error("Erro ao deletar usuário: " + msg);
    }
  };

  // Helper para verificar se é admin (flexível para maiúsculas/minúsculas)
  const isAdmin = (roleName?: string) => {
    return roleName?.toLowerCase().includes('admin');
  };

  if (loading) {
    return <p className="text-muted-foreground">Carregando usuários...</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome do Estabelecimento</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum usuário encontrado
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {/* Exibimos first_name pois foi lá que salvamos o nome do estabelecimento */}
                  {user.first_name || "Sem nome"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge variant={isAdmin(user.role?.name) ? "default" : "secondary"}>
                    {user.role?.name || "Usuário"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};