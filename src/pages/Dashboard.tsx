import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "@/lib/directus";
import { readMe, readItems, updateMe } from "@directus/sdk"; // Adicionado updateMe
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MetricCard from "@/components/dashboard/MetricCard";
import OrdersTable from "@/components/dashboard/OrdersTable";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  Package, 
  TrendingUp, 
  Users, 
  DollarSign, 
  LogOut,
  Clock,
  CreditCard,
  CalendarIcon,
  Power, // Ícone novo
  PlayCircle, // Ícone novo
  StopCircle // Ícone novo
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { toast } from "sonner";

interface ExtendedUser {
  id: string;
  email?: string;
  collection_name?: string;
  bot_ativo?: boolean; // Novo campo
  n8n_workflow_id?: string; // Novo campo
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [establishmentName, setEstablishmentName] = useState("Carregando...");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  
  // Estado do Bot
  const [botActive, setBotActive] = useState(false);
  const [updatingBot, setUpdatingBot] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 1. Busca dados do usuário INCLUINDO o status do bot
        const user = await client.request(readMe({
          fields: ['id', 'email', 'collection_name', 'bot_ativo', 'n8n_workflow_id'] 
        })) as ExtendedUser;

        if (!user) throw new Error("Usuário não encontrado");

        setUserEmail(user.email || "");
        setBotActive(user.bot_ativo || false); // Seta o estado inicial do botão

        // 2. Busca o Perfil
        try {
          const profiles = await client.request(readItems('crm_profiles', { limit: 1 }));
          if (profiles && profiles.length > 0) {
            const profile = profiles[0];
            setEstablishmentName(profile.nome_estabelecimento || "Nome Indefinido");
            const imageId = profile.logo || profile.logo_url;
            if (imageId) setLogoUrl(`${client.url}assets/${imageId}`);
          }
        } catch (error) {
          console.error("Erro perfil", error);
        }
        
        // 3. Carrega pedidos
        if (user.collection_name) {
            setActiveCollection(user.collection_name);
            await fetchOrders(user.collection_name);
        } else {
            toast.error("Tabela de pedidos não vinculada.");
            setLoading(false);
        }

      } catch (error) {
        navigate("/login");
      }
    };

    checkSession();
  }, [navigate]);

  const fetchOrders = async (tableName: string) => {
    try {
      const data = await client.request(readItems(tableName, { sort: ["-date_created"] }));
      setOrders(data || []);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- NOVA FUNÇÃO: Alternar Bot ---
  const toggleBot = async () => {
    setUpdatingBot(true);
    const newState = !botActive; // Inverte o estado atual

    try {
      // Atualiza o status no Directus
      await client.request(updateMe({
        bot_ativo: newState
      }));

      setBotActive(newState);
      
      if (newState) {
        toast.success("Automação ativada com sucesso!");
      } else {
        toast.info("Automação pausada.");
      }
      
    } catch (error) {
      console.error("Erro ao alterar bot:", error);
      toast.error("Erro ao alterar status da automação.");
      // Reverte o estado visual se der erro
      setBotActive(!newState);
    } finally {
      setUpdatingBot(false);
    }
  };
  // ---------------------------------

  const handleSignOut = async () => {
    await client.logout();
    navigate("/login");
  };

  // ... (Filtros e Cálculos permanecem iguais) ...
  const filteredOrders = orders.filter(order => {
    const dateField = order.date_created || order.data_pedido;
    if (!dateField) return false;
    const orderDate = new Date(dateField);
    const isAfterStart = !startDate || orderDate >= startDate;
    const isBeforeEnd = !endDate || orderDate <= new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    return isAfterStart && isBeforeEnd;
  });

  const parseCurrency = (value: any) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const cleanString = value.toString().replace('R$', '').replace(/\s/g, '').replace(',', '.');
    const number = parseFloat(cleanString);
    return isNaN(number) ? 0 : number;
  };

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + parseCurrency(order.valor_do_produto), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const completedOrders = filteredOrders.filter(
    order => (order.status?.toLowerCase() === 'concluído' || order.status?.toLowerCase() === 'concluido') && order.data_entrega
  );
  
  const deliveryTimeRanges = completedOrders.reduce((acc: any, order) => {
    const dateField = order.date_created || order.data_pedido;
    const diffInMinutes = (new Date(order.data_entrega).getTime() - new Date(dateField).getTime()) / (1000 * 60);
    let range = diffInMinutes < 30 ? '0-30 min' : diffInMinutes < 60 ? '30-60 min' : diffInMinutes < 90 ? '60-90 min' : '90+ min';
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {});
  const deliveryTimeData = Object.entries(deliveryTimeRanges).map(([name, value]) => ({ name, pedidos: value }));

  const paymentMethods = filteredOrders.reduce((acc: any, order) => {
    const method = order.forma_de_pagamento || "Não informado";
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});
  const paymentData = Object.entries(paymentMethods).map(([name, value]) => ({ name, value }));

  const deliveryDrivers = filteredOrders.reduce((acc: any, order) => {
    if (order.entregador) acc[order.entregador] = (acc[order.entregador] || 0) + 1;
    return acc;
  }, {});
  const driverData = Object.entries(deliveryDrivers).map(([name, value]) => ({ name, entregas: value })).sort((a: any, b: any) => b.entregas - a.entregas).slice(0, 5);

  const totalDeliveryTime = completedOrders.reduce((sum, order) => {
    const dateField = order.date_created || order.data_pedido;
    return sum + ((new Date(order.data_entrega).getTime() - new Date(dateField).getTime()) / (1000 * 60));
  }, 0);
  const averageDeliveryTime = completedOrders.length > 0 ? Math.round(totalDeliveryTime / completedOrders.length) : 0;

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-md" /> : <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center"><Package className="w-6 h-6 text-primary" /></div>}
            <div>
              <h1 className="text-xl font-bold">{establishmentName}</h1>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* BOTÃO DE ATIVAR/DESATIVAR O FLUXO */}
            <Button 
              variant={botActive ? "default" : "destructive"} 
              size="sm"
              onClick={toggleBot}
              disabled={updatingBot}
              className={cn(
                "transition-all duration-300",
                botActive ? "bg-green-600 hover:bg-green-700" : "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200"
              )}
            >
              {updatingBot ? (
                "..."
              ) : botActive ? (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Sistema Ativo
                </>
              ) : (
                <>
                  <StopCircle className="w-4 h-4 mr-2" />
                  Sistema Pausado
                </>
              )}
            </Button>

            <Button onClick={handleSignOut} variant="ghost" size="icon" className="text-muted-foreground">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Filtros e restante do conteúdo igual ao anterior */}
        <Card className="p-6">
            {/* ... Conteúdo dos Filtros (igual ao anterior) ... */}
            <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-semibold">Filtrar por período:</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP", { locale: ptBR }) : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && (
              <Button variant="ghost" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </Card>

        {/* Resto dos Cards e Gráficos ... */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard title="Total de Pedidos" value={totalOrders} icon={Package} color="primary" />
          <MetricCard title="Receita Total" value={`R$ ${totalRevenue.toFixed(2)}`} icon={DollarSign} color="success" />
          <MetricCard title="Tempo Médio de Entrega" value={averageDeliveryTime > 0 ? `${averageDeliveryTime} min` : "N/A"} icon={Clock} color="info" />
          <MetricCard title="Ticket Médio" value={`R$ ${averageOrderValue.toFixed(2)}`} icon={TrendingUp} color="secondary" />
          <MetricCard title="Entregadores Ativos" value={Object.keys(deliveryDrivers).length} icon={Users} color="warning" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráficos... (Copiados do anterior) */}
             {driverData.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Top Entregadores</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={driverData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="entregas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
          
           {/* Formas de Pagamento */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Formas de Pagamento
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                  {paymentData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px', paddingLeft: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
        
        <OrdersTable orders={filteredOrders} />
      </main>
    </div>
  );
};

export default Dashboard;