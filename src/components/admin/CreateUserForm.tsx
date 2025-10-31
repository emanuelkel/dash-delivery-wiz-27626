import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Image as ImageIcon } from "lucide-react";

export const CreateUserForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Sessão não encontrada");
      }

      let logoFileBase64 = null;
      let logoFileName = null;

      // Converter logo para base64 se houver
      if (logoFile) {
        const reader = new FileReader();
        logoFileBase64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
        
        const fileExt = logoFile.name.split(".").pop();
        logoFileName = `${Date.now()}.${fileExt}`;
      }

      // Chamar Edge Function para criar usuário
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          nome_estabelecimento: nomeEstabelecimento,
          role: role,
          logo_file: logoFileBase64,
          logo_filename: logoFileName
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Usuário criado com sucesso!");
      setEmail("");
      setPassword("");
      setNomeEstabelecimento("");
      setRole("user");
      setLogoFile(null);
      setLogoPreview(null);
      
      // Recarregar lista de usuários
      window.location.reload();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast.error("Erro ao criar usuário: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="usuario@exemplo.com"
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
            minLength={6}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do Estabelecimento</Label>
          <Input
            id="nome"
            type="text"
            placeholder="Nome do estabelecimento"
            value={nomeEstabelecimento}
            onChange={(e) => setNomeEstabelecimento(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Tipo de Acesso</Label>
          <Select value={role} onValueChange={(value: "admin" | "user") => setRole(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Logo do Estabelecimento</Label>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="w-24 h-24 rounded-lg border-2 border-border overflow-hidden">
              <img
                src={logoPreview}
                alt="Preview da logo"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <input
              type="file"
              id="logo-create"
              className="hidden"
              accept="image/*"
              onChange={handleLogoChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("logo-create")?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {logoPreview ? "Alterar Logo" : "Selecionar Logo"}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              PNG, JPG ou WEBP (máx. 2MB)
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading ? "Criando..." : "Criar Usuário"}
      </Button>
    </form>
  );
};