import { ICONS, type IconName, type LucideProps } from "@/components/icon/registry";

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

/**
 * Single icon entry point. Components reference icons by name instead of
 * importing icon packages directly, so the icon set is centralized and
 * swappable. Pass-through props: `size`, `strokeWidth`, `color`, `className`,
 * `aria-label`, etc.
 */
export function Icon({ name, ...props }: IconProps) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return <Glyph aria-hidden={props["aria-label"] ? undefined : true} {...props} />;
}
