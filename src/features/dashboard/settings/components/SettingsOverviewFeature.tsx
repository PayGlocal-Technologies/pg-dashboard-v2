import Link from "next/link";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { buildSettingsOverviewCards } from "@/features/dashboard/settings/helper";

/** "All settings" landing page. The cards are built from SETTINGS_NAV_GROUPS —
 * the same structure the left nav renders — so a page hidden from the nav
 * disappears here too, and no card can advertise a page that does not exist. */
export function SettingsOverviewFeature() {
  const categories = buildSettingsOverviewCards();

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Choose a category to update your personal profile, business profile, or platform
        configuration.
      </p>

      {/* Column count follows the card count so a hidden group never leaves an
          empty grid cell behind. */}
      <div
        className={cn(
          "grid gap-4 pt-5",
          categories.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
        )}
      >
        {categories.map((category) => (
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

              {/* The pages inside this group, so the card says what it covers
                  instead of promising sections that may not be live. */}
              <p className="text-xs font-medium text-foreground/70">
                {category.links.map((link) => link.label).join(" · ")}
              </p>

              {category.note && <p className="text-xs text-muted-foreground/80">{category.note}</p>}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
