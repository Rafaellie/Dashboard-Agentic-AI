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
    TableFooter,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import {
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core"
import {
    SortableContext,
    horizontalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// komponen header kolom yang dapat ditarik
const DraggableTableHead = ({ header }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: header.column.id,
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        width: header.getSize(),
        zIndex: isDragging ? 1 : 0,
        position: "relative",
        opacity: isDragging ? 0.8 : 1,
    }

    return (
        <TableHead
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            colSpan={header.colSpan}
            className={cn("bg-slate-50 dark:bg-slate-900 relative transition-colors cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-800", isDragging && "z-50 shadow-lg")}
        >
            <div className="flex items-center gap-2">
                <div className="p-0.5 text-slate-400 dark:text-slate-600">
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5 4h2v2H5V4zm4 0h2v2H9V4zM5 7h2v2H5V7zm4 0h2v2H9V7zm-4 3h2v2H5v-2zm4 0h2v2H9v-2z" />
                    </svg>
                </div>
                <div className="flex-1 font-bold text-[10px] uppercase tracking-wider">
                    {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
            </div>
        </TableHead>
    )
}

export function DataGridTableDnd({ className }) {
    const { table, tableLayout } = useDataGrid()
    const cellBorder = tableLayout?.cellBorder

    return (
        <div className={cn("relative w-full", className)}>
            <Table className={cn(cellBorder && "border-collapse")}>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            <SortableContext
                                items={table.getState().columnOrder}
                                strategy={horizontalListSortingStrategy}
                            >
                                {headerGroup.headers.map((header) => (
                                    <DraggableTableHead key={header.id} header={header} />
                                ))}
                            </SortableContext>
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
                {table.getFooterGroups().some((footerGroup) => 
                    footerGroup.headers.some((header) => header.column.columnDef.footer)
                ) && (
                    <TableFooter>
                        {table.getFooterGroups().map((footerGroup) => {
                            const hasRealFooters = footerGroup.headers.some(h => !!h.column.columnDef.footer && !h.isPlaceholder)
                            if (!hasRealFooters) return null;
                            
                            return (
                                <TableRow key={footerGroup.id}>
                                    {footerGroup.headers.map((header) => (
                                        <TableCell key={header.id} className={cn("py-2", cellBorder && "border")}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.footer, header.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )
                        })}
                    </TableFooter>
                )}
            </Table>
        </div>
    )
}
