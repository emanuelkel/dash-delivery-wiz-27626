import { useEffect, useState } from "react";
import { client } from "@/lib/directus"; // Nosso cliente
import { readMe, updateMe, uploadFiles } from "@directus/sdk"; // Funções do SDK
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Image as ImageIcon } from "lucide-react";

export const ProfileSettings = () => {
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null); // Mantemos para referência, se necessário

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await client.request(readMe({
          fields: ['id', 'first_name', 'avatar']
        }));

        if (!user) return;

        setUserId(user.id);
        setNomeEstabelecimento(user.first_name || "");
        
        // Constrói a URL da logo se ela existir
        if (user.avatar) {
          setLogoUrl(`${client.url}assets/${user.avatar}`);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        toast.error("Não foi possível carregar seu perfil.");
      }
    };

    loadProfile();
  }, []);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo de arquivo
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem");
        return;
      }

      // Validar tamanho (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 2MB");
        return;
      }

      // 1. Fazer upload do arquivo para o Directus
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', `Logo - ${nomeEstabelecimento || userId}`);

      const fileResult = await client.request(uploadFiles(formData));
      const fileId = fileResult.id || fileResult; // Pega o ID do arquivo

      // 2. Atualizar o campo 'avatar' do usuário logado
      await client.request(updateMe({
        avatar: fileId
      }));

      // 3. Atualizar a URL local para o preview
      const newLogoUrl = `${client.url}assets/${fileId}`;
      setLogoUrl(newLogoUrl);

      toast.success("Logo atualizada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      const msg = error?.errors?.[0]?.message || "Erro desconhecido";
      toast.error("Erro ao fazer upload da logo: " + msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      // Atualiza o 'first_name' (Nome do Estabelecimento) do usuário logado
      await client.request(updateMe({
        first_name: nomeEstabelecimento
      }));

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      const msg = error?.errors?.[0]?.message || "Erro desconhecido";
      toast.error("Erro ao salvar configurações: " + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do Estabelecimento / Título</Label>
          <Input
            id="nome"
            type="text"
            placeholder="Nome do seu estabelecimento"
            value={nomeEstabelecimento}
            onChange={(e) => setNomeEstabelecimento(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="w-24 h-24 rounded-lg border-2 border-border overflow-hidden">
                <img
                  src={logoUrl}
                  alt="Logo"
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
                id="logo-upload"
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("logo-upload")?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Enviando..." : logoUrl ? "Alterar Logo" : "Fazer Upload"}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                PNG, JPG ou WEBP (máx. 2MB)
              </p>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
};