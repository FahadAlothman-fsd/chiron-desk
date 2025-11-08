import { useState, useMemo } from "react";
import type { SortingState } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { columns, type Model } from "./columns";

interface ModelsDataTableProps {
	data: Model[];
}

export function ModelsDataTable({ data }: ModelsDataTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [providerFilter, setProviderFilter] = useState<string>("all");
	const [contextFilter, setContextFilter] = useState<string>("all");

	// Get unique providers from data (memoized)
	const uniqueProviders = useMemo(
		() => Array.from(new Set(data.map((model) => model.provider))).sort(),
		[data],
	);

	// Filter data based on all criteria (memoized to prevent infinite loops)
	const filteredData = useMemo(() => {
		return data.filter((model) => {
			// Search filter (model name)
			if (searchQuery) {
				const searchLower = searchQuery.toLowerCase();
				if (!model.name.toLowerCase().includes(searchLower)) {
					return false;
				}
			}

			// Provider filter
			if (providerFilter !== "all" && model.provider !== providerFilter) {
				return false;
			}

			// Context length filter
			if (contextFilter !== "all") {
				const contextLength = model.contextLength;
				switch (contextFilter) {
					case "8k":
						if (contextLength < 8000) return false;
						break;
					case "32k":
						if (contextLength < 32000) return false;
						break;
					case "128k":
						if (contextLength < 128000) return false;
						break;
					case "200k":
						if (contextLength < 200000) return false;
						break;
				}
			}

			return true;
		});
	}, [data, searchQuery, providerFilter, contextFilter]);

	const table = useReactTable({
		data: filteredData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
		initialState: {
			pagination: {
				pageSize: 50,
			},
		},
		defaultColumn: {
			minSize: 60,
			maxSize: 400,
		},
		// Disable auto-reset to prevent re-renders
		autoResetPageIndex: false,
	});

	return (
		<div className="space-y-3">
			{/* Filter Bar */}
			<div className="flex flex-wrap gap-3">
				<div className="flex-1 min-w-[200px]">
					<Input
						placeholder="Filter by model..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-9 max-w-sm text-sm"
					/>
				</div>
				<Select value={providerFilter} onValueChange={setProviderFilter}>
					<SelectTrigger className="h-9 w-[160px] text-sm">
						<SelectValue placeholder="Provider" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Providers</SelectItem>
						{uniqueProviders.map((provider) => (
							<SelectItem key={provider} value={provider}>
								{provider}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={contextFilter} onValueChange={setContextFilter}>
					<SelectTrigger className="h-9 w-[160px] text-sm">
						<SelectValue placeholder="Min Context" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All</SelectItem>
						<SelectItem value="8k">8k+</SelectItem>
						<SelectItem value="32k">32k+</SelectItem>
						<SelectItem value="128k">128k+</SelectItem>
						<SelectItem value="200k">200k+</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table with horizontal scroll */}
			<div className="rounded-md border overflow-x-auto">
				<Table className="text-sm">
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="border-b">
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className="h-9 px-3 text-xs font-medium whitespace-nowrap"
										style={{
											width: header.column.columnDef.size
												? `${header.column.columnDef.size}px`
												: undefined,
										}}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className="border-b hover:bg-muted/30 transition-colors"
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											className="px-3 py-2"
											style={{
												width: cell.column.columnDef.size
													? `${cell.column.columnDef.size}px`
													: undefined,
											}}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center text-sm text-muted-foreground"
								>
									No results found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between text-xs">
				<div className="text-muted-foreground">
					Showing {table.getRowModel().rows.length} of {filteredData.length}{" "}
					{filteredData.length !== data.length && `(${data.length} total)`}{" "}
					models
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="h-8 px-3 text-xs"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						Previous
					</Button>
					<div className="text-muted-foreground">
						Page {table.getState().pagination.pageIndex + 1} of{" "}
						{table.getPageCount()}
					</div>
					<Button
						variant="outline"
						size="sm"
						className="h-8 px-3 text-xs"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
