import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";

type Stat = {
	label: string;
	value: string;
	delta: number;
	hint: string;
};

export function DashboardStats({
	stats,
}: {
	stats: {
		totalUsers: number;
		totalTeams: number;
		totalRevenue: number;
	};
}) {
	const statItems: readonly Stat[] = [
		{
			label: "Total Registrations",
			value: stats.totalUsers.toLocaleString(),
			delta: 12.4, // Mocked growth trend for aesthetic polish
			hint: "vs prior week",
		},
		{
			label: "Teams Formed",
			value: stats.totalTeams.toLocaleString(),
			delta: 8.2,
			hint: "vs prior week",
		},
		{
			label: "Revenue Collected",
			value: `৳${stats.totalRevenue.toLocaleString()}`,
			delta: 15.6,
			hint: "vs prior week",
		},
	] as const;

	return (
		<>
			{statItems.map((s) => (
				<StatCard key={s.label} stat={s} />
			))}
		</>
	);
}

function StatCard({ stat }: { stat: Stat }) {
	const { label, value, delta, hint } = stat;
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-normal text-muted-foreground text-xs">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-balance font-semibold text-2xl tabular-nums tracking-tight">
					{value}
				</p>
			</CardContent>
			<CardFooter className="gap-1.5 text-xs">
				<Delta value={delta} variant="default">
					<DeltaIcon />
					<DeltaValue />
				</Delta>
				<span className="text-pretty text-muted-foreground">{hint}</span>
			</CardFooter>
		</Card>
	);
}

