import Link from "next/link";
import { Card } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";

interface OverviewCategory {
  href: string;
  icon: IconName;
  title: string;
  description: string;
  note?: string;
}

const CATEGORIES: OverviewCategory[] = [
  {
    href: "/settings/personal",
    icon: "users",
    title: "Personal settings",
    description: "Profile photo, name, email, contact details and change password for your signed-in user.",
  },
  {
    href: "/settings/business",
    icon: "building-2",
    title: "Account & business",
    description: "Merchant account, legal entity, banking, tax IDs, and customer-facing branding.",
    note: "GST and compliance live under Tax; eBRC stays in Finance in the main nav.",
  },
  // OUT OF SCOPE — Payments & platform landing card hidden for now (it links
  // straight to /settings/payments, which is currently hidden). The route/page
  // and components stay in the codebase. Restore by un-commenting this entry.
  // {
  //   href: "/settings/payments",
  //   icon: "credit-card",
  //   title: "Payments & platform",
  //   description: "Payment methods, integrations, and how we notify you.",
  // },
];

/** "All settings" landing page: 3 clickable category cards. */
export function SettingsOverviewFeature() {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Choose a category to update your personal profile, business profile, or platform
        configuration.
      </p>

      <div className="grid gap-4 pt-5 sm:grid-cols-3">
        {CATEGORIES.map((category) => (
          <Link key={category.href} href={category.href} className="block">
            <Card className="h-full gap-3 p-5 transition-colors hover:border-foreground/20 hover:bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name={category.icon} size={18} />
                </span>
                <Icon name="chevron-right" size={16} className="text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">{category.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
              </div>
              {category.note && <p className="text-xs text-muted-foreground/80">{category.note}</p>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
