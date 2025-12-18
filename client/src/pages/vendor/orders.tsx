import { useState } from "react";
import VendorLayout from "@/components/layout/VendorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Eye,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function VendorOrders() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '' });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: () => api.vendor.getOrders(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, note }: { orderId: string; status: string; note?: string }) => 
      api.vendor.updateOrderStatus(orderId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      setSelectedOrder(null);
      setStatusUpdate({ status: '', note: '' });
      toast({ title: "Order status updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusUpdate = () => {
    if (selectedOrder && statusUpdate.status) {
      updateStatusMutation.mutate({
        orderId: selectedOrder.id,
        status: statusUpdate.status,
        note: statusUpdate.note,
      });
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(parseFloat(amount.toString()));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const filteredOrders = (orders || []).filter((order: any) => {
    const matchesSearch = order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(search.toLowerCase());
    
    if (tab === 'all') return matchesSearch;
    if (tab === 'in-progress') return matchesSearch && ['pending', 'processing', 'shipped'].includes(order.status);
    if (tab === 'completed') return matchesSearch && ['delivered', 'cancelled'].includes(order.status);
    return matchesSearch && order.status === tab;
  });

  const orderCounts = {
    all: orders?.length || 0,
    pending: orders?.filter((o: any) => o.status === 'pending').length || 0,
    processing: orders?.filter((o: any) => o.status === 'processing').length || 0,
    shipped: orders?.filter((o: any) => o.status === 'shipped').length || 0,
    delivered: orders?.filter((o: any) => o.status === 'delivered').length || 0,
  };

  return (
    <VendorLayout 
      title="Orders" 
      subtitle={`${orders?.length || 0} total orders`}
    >
      {/* Search and Tabs */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search orders by ID or customer..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-orders"
          />
        </div>
        
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({orderCounts.all})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({orderCounts.pending})
            </TabsTrigger>
            <TabsTrigger value="processing" data-testid="tab-processing">
              Processing ({orderCounts.processing})
            </TabsTrigger>
            <TabsTrigger value="shipped" data-testid="tab-shipped">
              Shipped ({orderCounts.shipped})
            </TabsTrigger>
            <TabsTrigger value="delivered" data-testid="tab-delivered">
              Delivered ({orderCounts.delivered})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm">Orders will appear here when customers purchase your products</p>
            </div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 text-sm font-medium text-slate-600">
                <div className="col-span-2">Order ID</div>
                <div className="col-span-3">Customer</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
              {filteredOrders.map((order: any) => (
                <div 
                  key={order.id} 
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors"
                  data-testid={`order-row-${order.id}`}
                >
                  <div className="col-span-2">
                    <span className="font-mono text-sm text-primary">#{order.id.slice(-8)}</span>
                  </div>
                  <div className="col-span-3">
                    <div className="font-medium text-slate-800">{order.customer?.name || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{order.customer?.email}</div>
                  </div>
                  <div className="col-span-2 text-slate-600">
                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </div>
                  <div className="col-span-2 font-medium text-slate-800">
                    {formatCurrency(order.items.reduce((sum: number, item: any) => 
                      sum + parseFloat(item.price) * item.quantity, 0))}
                  </div>
                  <div className="col-span-2">
                    <Badge className={`${getStatusColor(order.status)} gap-1`}>
                      {getStatusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedOrder(order);
                        setStatusUpdate({ status: order.status, note: '' });
                      }}
                      data-testid={`button-view-${order.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={selectedOrder !== null} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id.slice(-8)}</DialogTitle>
            <DialogDescription>
              Placed on {selectedOrder && format(new Date(selectedOrder.createdAt), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-800 mb-2">Customer</h4>
                <div className="text-sm text-slate-600">
                  <p>{selectedOrder.customer?.name}</p>
                  <p>{selectedOrder.customer?.email}</p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium text-slate-800 mb-3">Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.imageUrl || 'https://via.placeholder.com/50'} 
                          alt={item.name}
                          className="w-12 h-12 rounded object-cover bg-slate-100"
                        />
                        <div>
                          <div className="font-medium text-slate-800">{item.name}</div>
                          <div className="text-sm text-slate-500">Qty: {item.quantity}</div>
                        </div>
                      </div>
                      <div className="font-medium">
                        {formatCurrency(parseFloat(item.price) * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Update Status */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-slate-800 mb-3">Update Status</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Status</Label>
                    <Select 
                      value={statusUpdate.status} 
                      onValueChange={(value) => setStatusUpdate({ ...statusUpdate, status: value })}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Note (optional)</Label>
                    <Textarea 
                      value={statusUpdate.note}
                      onChange={(e) => setStatusUpdate({ ...statusUpdate, note: e.target.value })}
                      placeholder="Add a note about this status change..."
                      rows={2}
                      data-testid="input-status-note"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Close
            </Button>
            <Button 
              onClick={handleStatusUpdate}
              disabled={updateStatusMutation.isPending || !statusUpdate.status || statusUpdate.status === selectedOrder?.status}
              data-testid="button-update-status"
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
