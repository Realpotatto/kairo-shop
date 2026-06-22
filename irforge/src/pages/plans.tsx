import { useListPlans, useGetCurrentPlan } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function Plans() {
  const { data: plans, isLoading } = useListPlans();
  const { data: currentPlan } = useGetCurrentPlan();

  return (
    <div className="space-y-6">
      <div className="flex justify-center items-center flex-col text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Plans & Billing</h1>
        <p className="text-muted-foreground mt-2">Choose the right plan for your bots.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto"><div className="animate-pulse h-96 bg-card rounded-lg" /><div className="animate-pulse h-96 bg-card rounded-lg" /><div className="animate-pulse h-96 bg-card rounded-lg" /></div>
      ) : plans ? (
        <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.planId === plan.id;
            return (
              <Card key={plan.id} className={`flex flex-col ${plan.popular ? 'border-primary shadow-md relative' : ''}`}>
                {plan.popular && <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                    ${plan.price}
                    <span className="ml-1 text-xl font-medium text-muted-foreground">/{plan.interval}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {plan.maxBots} Bots</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {plan.maxPlugins} Plugins</li>
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant={isCurrent ? "outline" : plan.popular ? "default" : "secondary"} disabled={isCurrent}>
                    {isCurrent ? "Current Plan" : "Upgrade"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
