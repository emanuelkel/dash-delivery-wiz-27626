import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserId(session.user.id);

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("nome_estabelecimento, logo_url")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setNomeEstabelecimento(profile.nome_estabelecimento || "");
        setLogoUrl(profile.logo_url);
      }
    };

    loadProfile();
  }, []);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      const file = event.target.files?.[0];
      if (!file || !userId) return;

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

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload para o bucket logos
      const { error: uploadError, data } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      
      // Atualizar no perfil
      const { error: updateError } = await (supabase as any)
        .from("profiles")
        .update({ logo_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast.success("Logo atualizada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload da logo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ nome_estabelecimento: nomeEstabelecimento })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações: " + error.message);
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