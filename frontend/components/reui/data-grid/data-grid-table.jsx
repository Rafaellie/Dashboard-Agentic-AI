"use client"

import * as React from "react"
import { flexRender } from "@tanstack/react-table"
import { useDataGrid } from "./data-grid"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export function DataGridTable({ className }) {
    const { table, tableLayout } = useDataGrid()
    const cellBorder = tableLayout?.cellBorder

    return (
        <div className={cn("relative w-full", className)}>
            <Table className={cn(cellBorder && "border-collapse")}>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        style={{
                                            width: header.getSize(),
                                        }}
                                        className={cn(cellBorder && "border")}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className={cn(row.getIsGrouped() ? "bg-slate-100/30 dark:bg-slate-900/40 font-medium" : "")}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        className={cn("py-2", cellBorder && "border")}
                                    >
                                        {cell.getIsGrouped() ? (
                                            flexRender(cell.column.columnDef.cell, cell.getContext())
                                        ) : cell.getIsAggregated() ? (
                                            flexRender(
                                                cell.column.columnDef.aggregatedCell ??
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )
                                        ) : cell.getIsPlaceholder() ? null : (
                                            flexRender(cell.column.columnDef.cell, cell.getContext())
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={table.getAllColumns().length}
                                className="h-24 text-center"
                            >
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
