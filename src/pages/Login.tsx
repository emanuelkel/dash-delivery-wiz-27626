import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "@/lib/directus";
import { login, readMe, readItems } from "@directus/sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [establishmentName, setEstablishmentName] = useState("Dashboard Delivery");

  useEffect(() => {
    const checkSession = async () => {
      try {
        await client.request(readMe());
        navigate("/dashboard");
      } catch (error) {
        // Não logado
      }
    };

    const fetchPublicProfile = async () => {
      try {
        const result = await client.request(readItems('crm_profiles', { limit: 1 }));
        if (result && result[0]?.nome_estabelecimento) {
          setEstablishmentName(result[0].nome_estabelecimento);
        }
      } catch (error) {
        // Se der erro (403), mantém o nome padrão
      }
    };

    checkSession();
    fetchPublicProfile();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await client.login(email, password);
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);
      toast.error("Email ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md p-8 shadow-elevated">
        <div className="flex flex-col items-center mb-8">
          
          {/* --- AQUI ESTÁ A SUA LOGO --- */}
          {/* Certifique-se de colocar o arquivo logo.png na pasta 'public' */}
          <img 
            src="/logo.png" 
            alt="Logo da Empresa" 
            className="w-32 h-32 object-contain mb-4"
            onError={(e) => {
              // Fallback: Se a imagem não existir, mostra um texto ou ícone simples
              e.currentTarget.style.display = 'none';
            }}
          />
          {/* ----------------------------- */}

          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-center">
            {establishmentName}
          </h1>
          <p className="text-muted-foreground mt-2">
  Sistema de gestão de entregas |{" "}
  <a 
    href="https://www.instagram.com/emanuelgomes.digital" 
    target="_blank" 
    rel="noopener noreferrer"
    className="hover:text-primary hover:underline transition-colors cursor-pointer"
  >
    Emanuel Gomes
  </a>
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