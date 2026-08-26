"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";

interface PaymentProduct {
  key: string;
  icon: IconName;
  title: string;
  description: string;
  enabled: boolean;
}

// TODO(integration): no payment-product enablement endpoint exists yet,
// enabled state is local-only mock state for this session.
const INITIAL_PRODUCTS: PaymentProduct[] = [
  {
    key: "domestic",
    icon: "credit-card",
    title: "Domestic Cards, UPI & Netbanking",
    description:
      "Accept payments across India via UPI, netbanking, and domestic cards with reliable success rates.",
    enabled: true,
  },
  {
    key: "international",
    icon: "globe",
    title: "International Cards",
    description:
      "Accept International cards and global payment methods with high success rates and localised checkouts.",
    enabled: true,
  },
  {
    key: "global-accounts",
    icon: "wallet",
    title: "Global Accounts",
    description:
      "Collect payments across 7+ local currencies, 33+ global currencies with transparent pricing and instant FIRA.",
    enabled: false,
  },
];

export function PaymentsFeature() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);

  function enableProduct(key: string) {
    const product = products.find((p) => p.key === key);
    setProducts((prev) => prev.map((p) => (p.key === key ? { ...p, enabled: true } : p)));
    toast.success(`${product?.title ?? "Product"} enabled`);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" subtitle="The payment products enabled on your account." />

      <div className="grid gap-4 sm:grid-cols-3">
        {products.map((product) => (
          <Card key={product.key} className="h-full gap-3 p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name={product.icon} size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">{product.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
            </div>
            <div className="mt-auto">
              {product.enabled ? (
                <Badge variant="success" size="sm" leftIcon={<Icon name="check" size={12} />}>
                  Enabled
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => enableProduct(product.key)}
                >
                  Enable
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
