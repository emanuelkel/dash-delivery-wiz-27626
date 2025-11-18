import { useState } from "react";
import { client } from "@/lib/directus";
import { createUser, uploadFiles, readRoles } from "@directus/sdk";
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
  const [roleName, setRoleName] = useState<"Administrator" | "User">("User"); // Nomes padrão do Directus (capitalizados)
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
    // Preview local da imagem
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
      let logoId = null;

      // 1. Upload da Logo (se houver)
      if (logoFile) {
        const formData = new FormData();
        formData.append('title', `Logo - ${nomeEstabelecimento}`);
        formData.append('file', logoFile);

        const fileResult = await client.request(uploadFiles(formData));
        // O Directus retorna um objeto ou array, garantimos o ID
        logoId = fileResult.id || fileResult; 
      }

      // 2. Buscar o ID da Role baseada no nome selecionado
      // Nota: No Directus, as roles têm IDs (UUIDs). Precisamos buscar o ID correspondente ao nome.
      // Certifique-se que no seu Directus existem Roles com nome "Administrator" e "User" (ou adapte aqui)
      const roles = await client.request(readRoles({
        filter: {
          name: { _eq: roleName }
        }
      }));

      if (!roles || roles.length === 0) {
        throw new Error(`Função (Role) '${roleName}' não encontrada no Directus.`);
      }

      const roleId = roles[0].id;

      // 3. Criar o Usuário
      await client.request(createUser({
        email: email,
        password: password,
        role: roleId,
        first_name: nomeEstabelecimento, // Usando o campo de nome padrão para o estabelecimento
        avatar: logoId, // Vincula a imagem enviada ao avatar do usuário
        // Se você criou um campo personalizado 'nome_estabelecimento' no directus_users, descomente abaixo:
        // nome_estabelecimento: nomeEstabelecimento 
      }));

      toast.success("Usuário criado com sucesso!");
      
      // Limpar formulário
      setEmail("");
      setPassword("");
      setNomeEstabelecimento("");
      setRoleName("User");
      setLogoFile(null);
      setLogoPreview(null);
      
      // Recarregar página para atualizar lista
      window.location.reload();

    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      // Tenta extrair mensagem de erro amigável do Directus
      const msg = error?.errors?.[0]?.message || error.message || "Erro desconhecido";
      toast.error("Erro ao criar usuário: " + msg);
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
          <Select value={roleName} onValueChange={(value: "Administrator" | "User") => setRoleName(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Ajuste os valores abaixo conforme os nomes REAIS das suas Roles no Directus */}
              <SelectItem value="User">Usuário</SelectItem>
              <SelectItem value="Administrator">Administrador</SelectItem>
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