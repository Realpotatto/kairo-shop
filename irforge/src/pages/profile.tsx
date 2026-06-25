import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { customFetch } from "@workspace/api-client-react";
import { TelegramLoginButton, type TelegramWidgetUser } from "@/components/telegram-login-button";
import { useTelegramWebApp } from "@/hooks/use-telegram-webapp";
import { Send, Info, Loader2 } from "lucide-react";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  telegramId?: string | null;
  telegramUsername?: string | null;
  telegramFirstName?: string | null;
  telegramLastName?: string | null;
  telegramPhotoUrl?: string | null;
};

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [linking, setLinking] = useState(false);
  const { isInsideTelegram, user: tgUser, initData, ready, expand } = useTelegramWebApp();

  // اگه داخل Mini App هست، WebApp رو آماده کن
  useEffect(() => {
    if (isInsideTelegram) {
      ready();
      expand();
    }
  }, [isInsideTelegram]);

  if (!user) return null;
  const u = user;

  const isTelegramLinked = Boolean(u.telegramId);
  const displayAvatar = u.telegramPhotoUrl || u.avatar || "";
  const telegramFullName = [u.telegramFirstName, u.telegramLastName].filter(Boolean).join(" ");

  // لینک کردن از طریق Mini App (initData)
  async function handleMiniAppLink() {
    if (!initData) return;
    setLinking(true);
    try {
      await customFetch("/api/auth/telegram/miniapp", {
        method: "POST",
        body: JSON.stringify({ initData }),
      });
      await refreshUser();
      toast({
        title: "Telegram connected",
        description: "Your Telegram profile is now linked.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Couldn't connect Telegram",
        description: error?.message || "Please try again.",
      });
    } finally {
      setLinking(false);
    }
  }

  // لینک کردن از طریق Login Widget (خارج از تلگرام)
  async function handleTelegramAuth(tgWidgetUser: TelegramWidgetUser) {
    setLinking(true);
    try {
      await customFetch("/api/auth/telegram", {
        method: "POST",
        body: JSON.stringify(tgWidgetUser),
      });
      await refreshUser();
      toast({
        title: "Telegram connected",
        description: "Your Telegram profile photo and username are now linked.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Couldn't connect Telegram",
        description: error?.message || "Please try again.",
      });
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={displayAvatar} />
              <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-lg">{user.name}</h3>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4 text-primary" />
            Telegram
          </CardTitle>
          <CardDescription>
            {isTelegramLinked
              ? "Your Telegram identity is linked and shown automatically below."
              : "Connect your Telegram account to automatically pull in your profile photo and username."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTelegramLinked ? (
            // حساب لینک شده — نمایش اطلاعات
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={u.telegramPhotoUrl || ""} />
                <AvatarFallback>{(u.telegramFirstName ?? "T").charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                {telegramFullName && <p className="font-medium">{telegramFullName}</p>}
                {u.telegramUsername && (
                  <Badge variant="secondary" className="font-mono">@{u.telegramUsername}</Badge>
                )}
              </div>
            </div>
          ) : isInsideTelegram && tgUser ? (
            // داخل Mini App — دکمه اتصال خودکار
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={tgUser.photo_url || ""} />
                  <AvatarFallback>{tgUser.first_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {[tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ")}
                  </p>
                  {tgUser.username && (
                    <p className="text-xs text-muted-foreground">@{tgUser.username}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleMiniAppLink}
                disabled={linking}
                className="w-full"
              >
                {linking ? (
                  <><Loader2 className="size-4 me-2 animate-spin" /> Connecting…</>
                ) : (
                  <><Send className="size-4 me-2" /> Connect this Telegram account</>
                )}
              </Button>
            </div>
          ) : TELEGRAM_BOT_USERNAME ? (
            // خارج از تلگرام — Login Widget
            <TelegramLoginButton botUsername={TELEGRAM_BOT_USERNAME} onAuth={handleTelegramAuth} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Telegram login isn't configured yet — set VITE_TELEGRAM_BOT_USERNAME and
              TELEGRAM_BOT_TOKEN to enable this.
            </p>
          )}

          {linking && <p className="text-sm text-muted-foreground">Linking your account…</p>}

          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="size-4 shrink-0 mt-0.5" />
            <span>
              Telegram only shares your name, username, and profile photo through this login —
              it never shares your phone number here. To collect a phone number you'd need a
              separate "share contact" step inside an actual chat with a bot.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
