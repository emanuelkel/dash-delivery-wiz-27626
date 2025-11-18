import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "@/lib/directus"; // Cliente Directus
import { readMe } from "@directus/sdk"; // Função para ler dados do próprio usuário
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, LogOut } from "lucide-react";
import { toast } from "sonner";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { UsersList } from "@/components/admin/UsersList";
import { ProfileSettings } from "@/components/admin/ProfileSettings";

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // 1. Busca dados do usuário atual, incluindo o nome da Role
        const user = await client.request(readMe({
          fields: ['role.name']
        }));

        if (!user) {
          navigate("/login");
          return;
        }

        // 2. Verifica se é Admin
        // O Directus tem uma Role padrão chamada "Administrator", mas verificamos qualquer coisa com "Admin"
        const roleName = user.role?.name || "";
        
        if (!roleName.toLowerCase().includes("admin")) {
          toast.error("Acesso negado. Área restrita a administradores.");
          navigate("/dashboard");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Erro de autenticação:", error);
        // Se der erro (ex: 401 Unauthorized), manda pro login
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await client.logout();
      navigate("/login");
      toast.success("Saiu com sucesso.");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Painel Administrativo
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Voltar ao Dashboard
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6">
              <ProfileSettings />
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Criar Novo Usuário</h2>
              <CreateUserForm />
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Usuários Cadastrados</h2>
              <UsersList />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;