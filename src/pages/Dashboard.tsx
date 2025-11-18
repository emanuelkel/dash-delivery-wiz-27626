import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "@/lib/directus";
import { readMe, readItems } from "@directus/sdk";
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
  CalendarIcon
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

// Interface para tipar o usuário estendido
interface ExtendedUser {
  email?: string;
  first_name?: string;
  avatar?: string;
  collection_name?: string; // O campo novo que criamos
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [establishmentName, setEstablishmentName] = useState("Dashboard Delivery");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Estado para guardar o nome da tabela dinâmica
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 1. Buscamos o usuário E o campo 'collection_name'
        const user = await client.request(readMe({
          fields: ['email', 'first_name', 'avatar', 'collection_name'] 
        })) as ExtendedUser;

        if (!user) throw new Error("Usuário não encontrado");

        setUserEmail(user.email || "");
        if (user.first_name) setEstablishmentName(user.first_name);
        
        if (user.avatar) {
          setLogoUrl(`${client.url}assets/${user.avatar}`);
        }
        
        // 2. Verifica qual tabela esse usuário deve acessar
        if (user.collection_name) {
            setActiveCollection(user.collection_name);
            await fetchOrders(user.collection_name); // Passa o nome da tabela
        } else {
            toast.error("Seu usuário não tem uma tabela de pedidos vinculada. Contate o suporte.");
            setLoading(false);
        }

      } catch (error) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/login");
      }
    };

    checkSession();
  }, [navigate]);

  // Função agora aceita o nome da tabela como argumento
  const fetchOrders = async (tableName: string) => {
    try {
      // AQUI É A MÁGICA: Usa tableName em vez de string fixa
      const data = await client.request(readItems(tableName, {
        sort: ["-data_pedido"]
      }));

      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      
      // Tratamento de erro específico se a tabela não existir
      if (error?.errors?.[0]?.message?.includes("forbidden") || error?.message?.includes("403")) {
         toast.error(`Sem permissão para acessar a tabela: ${tableName}`);
      } else {
         toast.error(`Erro ao carregar pedidos da tabela: ${tableName}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await client.logout();
      navigate("/login");
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao tentar sair.");
    }
  };

  // Lógica de filtros e métricas continua igual
  const filteredOrders = orders.filter(order => {
    if (!order.data_pedido) return false;
    const orderDate = new Date(order.data_pedido);
    const isAfterStart = !startDate || orderDate >= startDate;
    const isBeforeEnd = !endDate || orderDate <= new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    return isAfterStart && isBeforeEnd;
  });

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.valor_do_produto) || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const completedOrders = filteredOrders.filter(
    order => order.status === 'concluído' && order.data_entrega && order.data_pedido
  );
  
  const totalDeliveryTime = completedOrders.reduce((sum, order) => {
    const orderTime = new Date(order.data_pedido).getTime();
    const deliveryTime = new Date(order.data_entrega).getTime();
    const diffInMinutes = (deliveryTime - orderTime) / (1000 * 60);
    return sum + diffInMinutes;
  }, 0);

  const averageDeliveryTime = completedOrders.length > 0 
    ? Math.round(totalDeliveryTime / completedOrders.length) 
    : 0;

  const deliveryTimeRanges = completedOrders.reduce((acc: any, order) => {
    const orderTime = new Date(order.data_pedido).getTime();
    const deliveryTime = new Date(order.data_entrega).getTime();
    const diffInMinutes = (deliveryTime - orderTime) / (1000 * 60);
    
    let range = '';
    if (diffInMinutes < 30) range = '0-30 min';
    else if (diffInMinutes < 60) range = '30-60 min';
    else if (diffInMinutes < 90) range = '60-90 min';
    else range = '90+ min';
    
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {});

  const deliveryTimeData = Object.entries(deliveryTimeRanges).map(([name, value]) => ({
    name,
    pedidos: value,
  }));

  const paymentMethods = filteredOrders.reduce((acc: any, order) => {
    const method = order.forma_de_pagamento || "Não informado";
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});

  const paymentData = Object.entries(paymentMethods).map(([name, value]) => ({
    name,
    value,
  }));

  const deliveryDrivers = filteredOrders.reduce((acc: any, order) => {
    if (order.entregador) {
      acc[order.entregador] = (acc[order.entregador] || 0) + 1;
    }
    return acc;
  }, {});

  const driverData = Object.entries(deliveryDrivers)
    .map(([name, value]) => ({ name, entregas: value }))
    .sort((a: any, b: any) => (b.entregas as number) - (a.entregas as number))
    .slice(0, 5);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-10 h-10 object-contain"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Package className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{establishmentName}</h1>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-semibold">Filtrar por período:</h2>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP", { locale: ptBR }) : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {(startDate || endDate) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </Card>

        {/* Se não houver tabela configurada, mostra aviso amigável */}
        {!activeCollection ? (
           <div className="text-center py-10">
             <h2 className="text-xl text-red-500">Nenhuma tabela de dados vinculada a este usuário.</h2>
           </div>
        ) : (
           <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <MetricCard
                title="Total de Pedidos"
                value={totalOrders}
                icon={Package}
                color="primary"
            />
            <MetricCard
                title="Receita Total"
                value={`R$ ${totalRevenue.toFixed(2)}`}
                icon={DollarSign}
                color="success"
            />
            <MetricCard
                title="Tempo Médio de Entrega"
                value={averageDeliveryTime > 0 ? `${averageDeliveryTime} min` : "N/A"}
                icon={Clock}
                color="info"
            />
            <MetricCard
                title="Ticket Médio"
                value={`R$ ${averageOrderValue.toFixed(2)}`}
                icon={TrendingUp}
                color="secondary"
            />
            <MetricCard
                title="Entregadores Ativos"
                value={Object.keys(deliveryDrivers).length}
                icon={Users}
                color="warning"
            />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {driverData.length > 0 && (
                <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Top Entregadores</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={driverData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                        contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        }}
                    />
                    <Bar dataKey="entregas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                </Card>
            )}

            {deliveryTimeData.length > 0 && (
                <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Tempo de Entrega
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={deliveryTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                        contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        }}
                    />
                    <Bar dataKey="pedidos" fill="hsl(var(--info))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                </Card>
            )}

            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Formas de Pagamento
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    >
                    {paymentData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip 
                    contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                    }}
                    />
                    <Legend 
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '12px', paddingLeft: '10px' }}
                    />
                </PieChart>
                </ResponsiveContainer>
            </Card>
            </div>

            <OrdersTable orders={filteredOrders} />
           </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;