import { useListMarketplaceItems } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Download, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Marketplace() {
  const { data: items, isLoading } = useListMarketplaceItems({});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-muted-foreground">Discover plugins, templates, and components for your bots.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse"><CardHeader className="h-32" /><CardContent className="h-10" /></Card>
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <Badge variant={item.isFree ? "secondary" : "default"}>
                    {item.isFree ? "Free" : `$${item.price}`}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex gap-2">
                  <span className="capitalize">{item.category}</span> • <span>by {item.author}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center"><Star className="w-3 h-3 mr-1 text-yellow-500" /> {item.rating}</span>
                  <span className="flex items-center"><Download className="w-3 h-3 mr-1" /> {item.installCount}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t">
                <Button className="w-full" variant="outline">View Details</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-card">
          <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Marketplace is empty</h2>
        </div>
      )}
    </div>
  );
}
