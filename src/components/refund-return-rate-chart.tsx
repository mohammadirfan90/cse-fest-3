"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { ArrowRightIcon } from "lucide-react";

/** Daily return rate (% of fulfilled orders returned), last 7 days (demo). */
const returnDaily7 = [
	{ day: "Mon", returnRate: 2.2 },
	{ day: "Tue", returnRate: 1.5 },
	{ day: "Wed", returnRate: 3.1 },
	{ day: "Thu", returnRate: 4.8 },
	{ day: "Fri", returnRate: 2.4 },
	{ day: "Sat", returnRate: 3.2 },
	{ day: "Sun", returnRate: 3.9 },
] as const;

/** Share of orders that were refunded over the same window (demo). */
const REFUNDED_SHARE_OF_ORDERS_PCT = 2.6;

const chartConfig = {
	submissions: {
		label: "Submissions",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function RefundReturnRateChart({
	data = [],
	totalSubmissions = 0,
}: {
	data?: { day: string; submissions: number }[];
	totalSubmissions?: number;
}) {
	const first = data[0]?.submissions ?? 0;
	const lastW = data.at(-1)?.submissions ?? first;
	const trendPct =
		first > 0
			? ((lastW - first) / first) * 100
			: 0;

	return (
		<Card className="md:col-span-2">
			<CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<CardTitle>Proposal Submissions</CardTitle>
					<CardDescription>Daily activity (last 7 days)</CardDescription>
				</div>
				<div className="space-y-1">
					<CardTitle className="text-right">
						{totalSubmissions}
					</CardTitle>
					<CardDescription>total submissions</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="mt-auto">
				{data.length > 0 ? (
					<ChartContainer
						className="aspect-auto h-56 w-full"
						config={chartConfig}
					>
						<LineChart
							accessibilityLayer
							data={data}
							margin={{ left: 12, right: 12, top: 12, bottom: 0 }}
						>
							<CartesianGrid horizontal={false} strokeDasharray="3 3" />
							<XAxis
								axisLine={false}
								dataKey="day"
								interval={1}
								minTickGap={8}
								tickLine={false}
								tickMargin={8}
							/>
							<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
							<Line
								dataKey="submissions"
								dot={false}
								stroke="var(--color-submissions)"
								strokeWidth={2.5}
								type="monotone"
							/>
						</LineChart>
					</ChartContainer>
				) : (
					<div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
						No submissions uploaded yet
					</div>
				)}
			</CardContent>
			<CardFooter>
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-muted-foreground text-xs">
					<Delta value={trendPct}>
						<DeltaIcon />
						<DeltaValue />
					</Delta>
					<span className="inline-flex min-w-0 text-pretty">
						vs first day (last 7 days)
					</span>
				</div>
				<a
					className="text-muted-foreground relative inline-flex items-center justify-center font-sans font-semibold rounded-lg text-sm transition-all duration-normal select-none cursor-pointer bg-transparent text-neutral-400 hover:text-neutral-50 hover:bg-neutral-800/40 py-1 px-2.5 text-sm gap-1"
					href="/admin/submissions"
				>
					Review desk
					<ArrowRightIcon aria-hidden="true" className="size-3.5 shrink-0" />
				</a>
			</CardFooter>
		</Card>
	);
}

