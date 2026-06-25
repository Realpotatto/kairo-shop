import { useState } from "react";
import { useListBots } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Bot as BotIcon, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
// FIX [1.1]: دیالوگ واقعی ساخت بات
import { CreateBotDialog } from "@/components/bots/CreateBotDialog";

export default function Bots() {
  const { data: bots, isLoading, refetch } = useListBots();
  // FIX [1.1]: state کنترل دیالوگ
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">My Bots</h1>
        {/* FIX [1.1]: onClick واقعی */}
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" /> Create New Bot
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20" />
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      ) : bots && bots.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <Card key={bot.id} className="flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <BotIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{bot.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">@{bot.username}</p>
                    </div>
                  </div>
                  <Badge variant={bot.status === "active" ? "default" : "secondary"}>
                    {bot.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {bot.description || "No description provided."}
                </p>
                <div className="flex gap-4 mt-4 text-sm">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Users</span>
                    <span className="font-medium">{bot.userCount || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Commands</span>
                    <span className="font-medium">{bot.commandCount || 0}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 border-t mt-4">
                <Button variant="ghost" className="w-full mt-4" asChild>
                  <Link href={`/bots/${bot.id}`}>
                    Manage Bot <ArrowRight className="ms-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-lg border border-dashed">
          <BotIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No bots yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            You haven't created any bots yet. Create your first bot to get started.
          </p>
          {/* FIX [1.1]: onClick واقعی */}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" /> Create Your First Bot
          </Button>
        </div>
      )}

      {/* FIX [1.1]: دیالوگ ساخت بات */}
      <CreateBotDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
