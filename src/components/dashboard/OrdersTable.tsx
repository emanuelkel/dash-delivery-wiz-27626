import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Order {
  id: number;
  nome: string;
  produto: string;
  valor_do_produto: number | string; // Aceita number ou string
  forma_de_pagamento: string;
  date_created?: string; // Opcional pois pode vir como data_pedido
  data_pedido?: string;  // Nome que criamos no banco
  status?: string;
}

interface OrdersTableProps {
  orders: Order[];
}

const OrdersTable = ({ orders }: OrdersTableProps) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Função segura para formatar moeda (trata string e number)
  const formatCurrency = (value: string | number) => {
    if (!value) return "R$ 0,00";
    
    let numValue: number;

    if (typeof value === 'string') {
      // Remove 'R$', espaços e troca vírgula por ponto
      const cleanString = value.replace('R$', '').replace(/\s/g, '').replace(',', '.');
      numValue = parseFloat(cleanString);
    } else {
      numValue = value;
    }

    if (isNaN(numValue)) return "R$ 0,00";

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    
    // Proteção contra campos undefined/null
    const nome = order.nome || "";
    const produto = order.produto || "";
    
    const matchesSearch = 
      nome.toLowerCase().includes(searchLower) ||
      produto.toLowerCase().includes(searchLower);
      
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "concluído":
      case "concluido":
        return "bg-success text-success-foreground";
      case "aguardando":
        return "bg-warning text-warning-foreground";
      case "separando":
        return "bg-info text-info-foreground";
      case "enviado":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="text-2xl font-bold">Pedidos</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="separando">Separando</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="concluído">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{order.nome || "Cliente"}</TableCell>
                    <TableCell className="max-w-xs truncate">{order.produto || "-"}</TableCell>
                    <TableCell>{formatCurrency(order.valor_do_produto)}</TableCell>
                    <TableCell>{order.forma_de_pagamento || "-"}</TableCell>
                    <TableCell>
                      {/* Tenta usar date_created OU data_pedido */}
                      {new Date(order.date_created || order.data_pedido || Date.now()).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status || "Pendente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};

export default OrdersTable;