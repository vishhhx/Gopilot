import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Check, Minus, Clock } from 'lucide-react';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 0,
    description: 'Perfect for trying out the platform',
    ctaLabel: 'Get Started',
    features: [
      { label: 'Up to 3 projects', included: true },
      { label: 'Basic analytics', included: true },
      { label: 'Community support', included: true },
      { label: 'Advanced features', included: false },
      { label: 'Priority support', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    priceMonthly: 29,
    description: 'Best for growing teams',
    ctaLabel: 'Start Free Trial',
    features: [
      { label: 'Unlimited projects', included: true },
      { label: 'Advanced analytics', included: true },
      { label: 'Priority support', included: true },
      { label: 'API access', included: true },
      { label: 'Custom integrations', comingSoon: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceMonthly: 99,
    description: 'For large-scale operations',
    ctaLabel: 'Contact Sales',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Dedicated support', included: true },
      { label: 'Custom SLA', included: true },
      { label: 'On-premise deployment', included: true },
      { label: 'Advanced security', included: true },
    ],
    isCustom: true,
  },
];

const PricingCards = () => {
  const [selectedPlan, setSelectedPlan] = useState('pro');

  const handleSelect = (planId) => {
    setSelectedPlan(planId);
    console.log('Selected plan:', planId);
  };

  return (
    <div className="min-h-screen  p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Select the perfect plan for your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isFeatured = plan.id === 'pro';
            const isSelected = selectedPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col h-full transition-all duration-300 hover:shadow-lg ${
                  isFeatured ? 'border-primary shadow-md scale-105' : ''
                } ${isSelected ? 'ring-2 ring-primary' : ''}`}
              >
                {isFeatured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="px-4 py-1 shadow-sm">Most Popular</Badge>
                  </div>
                )}

                <CardHeader className="pb-8 pt-6">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                  
                  <div className="mt-6">
                    <div className="flex items-baseline gap-2">
                      {plan.priceMonthly === 0 ? (
                        <span className="text-5xl font-bold tracking-tight">Free</span>
                      ) : (
                        <>
                          <span className="text-5xl font-bold tracking-tight">
                            ${plan.priceMonthly}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Billed monthly
                    </p>
                  </div>
                </CardHeader>

                <Separator />

                <CardContent className="flex-1 pt-6">
                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="mt-0.5">
                          {feature.included ? (
                            <Check className="h-5 w-5 text-primary" />
                          ) : feature.comingSoon ? (
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Minus className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </span>
                        <span className={`text-sm ${
                          feature.included 
                            ? 'text-foreground' 
                            : 'text-muted-foreground'
                        }`}>
                          {feature.label}
                          {feature.comingSoon && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Soon
                            </Badge>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <Separator />

                <CardFooter className="pt-6 flex-col gap-3">
                  <Button
                    variant={isFeatured ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => handleSelect(plan.id)}
                    className="w-full"
                  >
                    {plan.ctaLabel}
                  </Button>
                  
                  {plan.isCustom && (
                    <Badge variant="secondary" className="w-full justify-center py-2">
                      Enterprise Solution
                    </Badge>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingCards;