import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  MessageSquare, 
  BarChart3, 
  Settings,
  Plus,
  DollarSign,
  TrendingUp,
  Users
} from "lucide-react";
import { Link } from "wouter";

export default function SellerDashboard() {
  const stats = [
    { title: "Total Revenue", value: "$45,231.89", change: "+20.1% from last month", icon: DollarSign },
    { title: "Orders", value: "+2350", change: "+180.1% from last month", icon: ShoppingCart },
    { title: "Active Products", value: "124", change: "+12 new this week", icon: Package },
    { title: "Active Customers", value: "+573", change: "+201 since last hour", icon: Users },
  ];

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r bg-slate-50/50">
          <div className="p-6">
            <h2 className="text-lg font-bold font-display text-slate-800">Vendor Portal</h2>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <Button variant="secondary" className="w-full justify-start gap-3 bg-white shadow-sm font-medium">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
              <Package className="h-4 w-4" /> Products
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
              <ShoppingCart className="h-4 w-4" /> Orders
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
              <MessageSquare className="h-4 w-4" /> Messages
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
              <BarChart3 className="h-4 w-4" /> Analytics
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
              <Settings className="h-4 w-4" /> Settings
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Overview of your store's performance.</p>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add New Product
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Orders */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center text-primary font-bold">
                        #{1000 + i}
                      </div>
                      <div>
                        <div className="font-medium">Order #{1000 + i}</div>
                        <div className="text-sm text-muted-foreground">2 items • $125.00</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Paid
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </Layout>
  );
}
