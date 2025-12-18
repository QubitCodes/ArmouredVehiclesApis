import { useState } from "react";
import VendorLayout from "@/components/layout/VendorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, 
  Users,
  Mail,
  ShoppingBag,
  DollarSign
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function VendorCustomers() {
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ['vendor-customers'],
    queryFn: () => api.vendor.getCustomers(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredCustomers = (customers || []).filter((customer: any) => 
    customer.name?.toLowerCase().includes(search.toLowerCase()) ||
    customer.email?.toLowerCase().includes(search.toLowerCase()) ||
    customer.company?.toLowerCase().includes(search.toLowerCase())
  );

  // Sort by total spent
  const sortedCustomers = [...filteredCustomers].sort((a: any, b: any) => b.totalSpent - a.totalSpent);

  return (
    <VendorLayout 
      title="Customers" 
      subtitle={`${customers?.length || 0} customers have purchased from you`}
    >
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search customers..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-customers"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Customers</p>
                <p className="text-2xl font-bold text-slate-800">{customers?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(customers?.reduce((sum: number, c: any) => sum + c.totalSpent, 0) || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Avg. Order Value</p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(
                    customers?.length 
                      ? customers.reduce((sum: number, c: any) => sum + c.totalSpent, 0) / 
                        customers.reduce((sum: number, c: any) => sum + c.orderCount, 0) || 0
                      : 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : sortedCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No customers yet</p>
              <p className="text-sm">Customers will appear here after they make a purchase</p>
            </div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 text-sm font-medium text-slate-600">
                <div className="col-span-4">Customer</div>
                <div className="col-span-3">Company</div>
                <div className="col-span-2">Orders</div>
                <div className="col-span-3 text-right">Total Spent</div>
              </div>
              {sortedCustomers.map((customer: any, index: number) => (
                <div 
                  key={customer.id} 
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors"
                  data-testid={`customer-row-${customer.id}`}
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(customer.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-slate-800 flex items-center gap-2">
                        {customer.name}
                        {index < 3 && (
                          <Badge variant="secondary" className="text-xs">Top Customer</Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3 text-slate-600">
                    {customer.company || '-'}
                  </div>
                  <div className="col-span-2">
                    <Badge variant="outline">{customer.orderCount} orders</Badge>
                  </div>
                  <div className="col-span-3 text-right font-medium text-green-600">
                    {formatCurrency(customer.totalSpent)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </VendorLayout>
  );
}
