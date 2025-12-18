import VendorLayout from "@/components/layout/VendorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users,
  Plus,
  Eye
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function VendorDashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['vendor-analytics'],
    queryFn: () => api.vendor.getAnalytics(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  const stats = [
    { 
      title: "Total Revenue", 
      value: analytics ? formatCurrency(analytics.totalRevenue) : '$0.00', 
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    { 
      title: "Total Orders", 
      value: analytics?.totalOrders.toString() || '0', 
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      title: "Active Products", 
      value: analytics?.totalProducts.toString() || '0', 
      icon: Package,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    { 
      title: "Total Customers", 
      value: analytics?.totalCustomers.toString() || '0', 
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
  ];

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

  return (
    <VendorLayout 
      title="Dashboard" 
      subtitle="Overview of your store's performance"
      actions={
        <Link href="/vendor/products/new">
          <Button className="gap-2" data-testid="button-add-product">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </Link>
      }
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <Link href="/vendor/orders">
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : analytics?.recentOrders?.length ? (
              <div className="space-y-4">
                {analytics.recentOrders.slice(0, 5).map((order: any) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors"
                    data-testid={`order-row-${order.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary font-bold text-sm">
                        #{order.id.slice(-4)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">Order #{order.id.slice(-8)}</div>
                        <div className="text-sm text-slate-500">
                          {order.items.length} items • {formatCurrency(parseFloat(order.total))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                      <Link href={`/vendor/orders/${order.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No orders yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Top Products</CardTitle>
            <Link href="/vendor/products">
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : analytics?.topProducts?.length ? (
              <div className="space-y-3">
                {analytics.topProducts.map((product: any, index: number) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between py-3 border-b last:border-0"
                    data-testid={`top-product-${product.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-slate-100 grid place-items-center text-sm font-medium text-slate-600">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 text-sm">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.quantity} sold</div>
                      </div>
                    </div>
                    <div className="font-medium text-green-600">
                      {formatCurrency(product.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No sales data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  );
}
