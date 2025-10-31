import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
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

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [establishmentName, setEstablishmentName] = useState("Dashboard Delivery");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserEmail(session.user.email || "");
      
      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome_estabelecimento, logo_url")
        .eq("id", session.user.id)
        .maybeSingle();
      
      if (profile?.nome_estabelecimento) {
        setEstablishmentName(profile.nome_estabelecimento);
      }
      
      if (profile?.logo_url) {
        setLogoUrl(profile.logo_url);
      }
      
      await fetchOrders();
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate("/login");
        } else {
          setUserEmail(session.user.email || "");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("superpopular_pedidos")
        .select("*")
        .order("data_pedido", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        toast.error("Erro ao carregar pedidos");
      } else {
        setOrders(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
    toast.success("Logout realizado com sucesso!");
  };

  // Filter orders by date range
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.data_pedido);
    const isAfterStart = !startDate || orderDate >= startDate;
    const isBeforeEnd = !endDate || orderDate <= new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // Include end date
    return isAfterStart && isBeforeEnd;
  });

  // Calculate metrics
  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.valor_do_produto || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Calculate average delivery time
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

  // Delivery time ranges for chart
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

  // Payment methods distribution
  const paymentMethods = filteredOrders.reduce((acc: any, order) => {
    const method = order.forma_de_pagamento || "Não informado";
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});

  const paymentData = Object.entries(paymentMethods).map(([name, value]) => ({
    name,
    value,
  }));

  // Top delivery drivers (if available)
  const deliveryDrivers = filteredOrders.reduce((acc: any, order) => {
    if (order.entregador) {
      acc[order.entregador] = (acc[order.entregador] || 0) + 1;
    }
    return acc;
  }, {});

  const driverData = Object.entries(deliveryDrivers)
    .map(([name, value]) => ({ name, entregas: value }))
    .sort((a: any, b: any) => b.entregas - a.entregas)
    .slice(0, 5);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
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
        {/* Date Filter */}
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

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Total de Pedidos"
            value={totalOrders}
            icon={Package}
            color="primary"
            trend={{ value: 12, isPositive: true }}
          />
          <MetricCard
            title="Receita Total"
            value={`R$ ${totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            color="success"
            trend={{ value: 8, isPositive: true }}
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Delivery Drivers */}
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

          {/* Delivery Time Distribution */}
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

          {/* Payment Methods */}
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
                  {paymentData.map((entry, index) => (
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

        {/* Orders Table */}
        <OrdersTable orders={filteredOrders} />
      </main>
    </div>
  );
};

export default Dashboard;
