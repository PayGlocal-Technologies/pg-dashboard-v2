import { Badge, StatusBadge, type Column } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { CopyableCell } from "@/components/common/CopyableCell";
import { ROLE_META } from "@/features/dashboard/team-management/constants";
import type { TeamMemberRow, TeamMemberStatus } from "@/features/dashboard/team-management/types";

export const TEAM_STATUS_META: Record<
  TeamMemberStatus,
  { label: string; variant: BadgeVariant; trailIcon: BadgeTrailIcon }
> = {
  ACTIVE: { label: "Active", variant: "success", trailIcon: "check" },
  INVITE_SENT: { label: "Invite Sent", variant: "info", trailIcon: "arrow-right" },
  INACTIVE: { label: "Inactive", variant: "muted", trailIcon: "x" },
};

export const teamMemberColumns: Column<TeamMemberRow>[] = [
  {
    key: "name",
    header: "Name",
    minWidth: 160,
    cellClassName: "pl-5",
    render: (row) => (
      <span className="whitespace-nowrap text-[13px] font-medium text-foreground">
        {row.firstName} {row.lastName}
      </span>
    ),
  },
  {
    key: "username",
    header: "Username",
    minWidth: 150,
    render: (row) => <CopyableCell value={row.username} label="Username" monospace />,
  },
  {
    key: "role",
    header: "Role",
    minWidth: 130,
    render: (row) => (
      <Badge variant="secondary" size="sm">
        {ROLE_META[row.role].label}
      </Badge>
    ),
  },
  {
    key: "merchantId",
    header: "Merchant ID",
    minWidth: 140,
    render: (row) => (
      <span className="whitespace-nowrap font-mono text-[13px] text-muted-foreground">{row.merchantId}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    minWidth: 120,
    render: (row) => {
      const meta = TEAM_STATUS_META[row.status];
      return <StatusBadge variant={meta.variant} label={meta.label} trailIcon={meta.trailIcon} size="sm" />;
    },
  },
  {
    key: "phone",
    header: "Phone Number",
    minWidth: 160,
    render: (row) => (
      <CopyableCell value={`${row.phoneCountryCode} ${row.phone}`} label="Phone number" />
    ),
  },
  {
    key: "email",
    header: "Email ID",
    minWidth: 210,
    render: (row) => <CopyableCell value={row.email} label="Email" />,
  },
  {
    // Blank trailing column, reserves room at the right edge so the hover-
    // revealed row actions never overlap the Email column's text, same
    // pattern as the settlements table's rowActionSpace column.
    key: "rowActionSpace",
    header: "",
    minWidth: 90,
    render: () => null,
  },
];
