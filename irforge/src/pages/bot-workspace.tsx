import { useGetBot, useListCommands, useListBotPlugins } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Square, Settings, Terminal, Blocks, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BotWorkspace() {
  const { botId } = useParams<{ botId: string }>();
  const { data: bot, isLoading } = useGetBot(botId, { query: { enabled: !!botId } });

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading bot workspace...</div>;
  if (!bot) return <div className="p-8 text-center">Bot not found</div>;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/bots"><ArrowLeft className="h-5 w-5 rtl-flip" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            {bot.name}
            <Badge variant={bot.status === 'active' ? 'default' : 'secondary'}>{bot.status}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">@{bot.username}</p>
        </div>
        <div className="flex items-center gap-2">
          {bot.status === 'active' ? (
            <Button variant="destructive" size="sm">
              <Square className="me-2 h-4 w-4" /> Stop Bot
            </Button>
          ) : bot.status === 'inactive' ? (
            <Button variant="default" size="sm">
              <Play className="me-2 h-4 w-4" /> Start Bot
            </Button>
          ) : bot.status === 'pending_payment' ? (
            <Badge variant="outline" className="text-amber-500 border-amber-500">
              Awaiting payment approval
            </Badge>
          ) : bot.status === 'payment_rejected' ? (
            <Badge variant="destructive">
              Payment rejected
            </Badge>
          ) : (
            <Badge variant="secondary">{bot.status}</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commands"><Terminal className="me-2 h-4 w-4"/> Commands</TabsTrigger>
          <TabsTrigger value="plugins"><Blocks className="me-2 h-4 w-4"/> Plugins</TabsTrigger>
          <TabsTrigger value="stats"><Activity className="me-2 h-4 w-4"/> Stats</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="me-2 h-4 w-4"/> Settings</TabsTrigger>
        </TabsList>
        
        <div className="flex-1 mt-4 border rounded-md bg-card overflow-auto p-4">
          <TabsContent value="overview" className="m-0 h-full">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Total Users</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{bot.userCount || 0}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Messages</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{bot.messageCount || 0}</div></CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="commands" className="m-0 h-full">Commands Editor Placeholder</TabsContent>
          <TabsContent value="plugins" className="m-0 h-full">Plugins Manager Placeholder</TabsContent>
          <TabsContent value="stats" className="m-0 h-full">Analytics Placeholder</TabsContent>
          <TabsContent value="settings" className="m-0 h-full">Settings Form Placeholder</TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
