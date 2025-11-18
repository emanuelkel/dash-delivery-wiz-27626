import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "@/lib/directus"; // Importa nosso novo cliente
import { login, readMe, readItems } from "@directus/sdk"; // Métodos do SDK
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState<{
    nome_estabelecimento?: string;
    logo_url?: string;
  } | null>(null);

  useEffect(() => {
    // 1. Verifica se já existe um usuário logado
    const checkSession = async () => {
      try {
        // Tenta buscar os dados do usuário atual ('me')
        await client.request(readMe());
        // Se não der erro, o usuário está logado
        navigate("/dashboard");
      } catch (error) {
        // Se der erro, o usuário não está logado, continuamos na tela de login
      }
    };

    // 2. Busca dados visuais do perfil (Logo, Nome)
    // Nota: No Directus, certifique-se de ter uma coleção 'profiles' com permissão de leitura pública
    // ou ajuste para buscar de onde preferir.
    const fetchPublicProfile = async () => {
      try {
        const result = await client.request(readItems('profiles', { limit: 1 }));
        if (result && result[0]) {
          setProfileData({
            nome_estabelecimento: result[0].nome_estabelecimento,
            logo_url: result[0].logo_url
          });
        }
      } catch (error) {
        console.log("Não foi possível carregar perfil público ou coleção inexistente.");
      }
    };

    checkSession();
    fetchPublicProfile();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Realiza o login no Directus
      await client.login(email, password);
      
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
      
    } catch (error: any) {
      console.error(error);
      // Tratamento básico de erro
      const message = error?.errors?.[0]?.message || "Verifique suas credenciais.";
      
      if (message.includes("INVALID_CREDENTIALS")) {
        toast.error("E-mail ou senha incorretos.");
      } else {
        toast.error("Erro ao entrar: " + message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md p-8 shadow-elevated">
        <div className="flex flex-col items-center mb-8">
          {profileData?.logo_url ? (
            <img 
              src={profileData.logo_url} 
              alt="Logo" 
              className="w-16 h-16 object-contain mb-4"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {profileData?.nome_estabelecimento || "Dashboard Delivery"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistema de gestão de entregas
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Login;