"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const DataGridContext = React.createContext(null)

export function useDataGrid() {
    const context = React.useContext(DataGridContext)
    if (!context) {
        throw new Error("useDataGrid must be used within a DataGrid")
    }
    return context
}

export function DataGrid({
    table,
    recordCount,
    tableLayout,
    children,
    className,
}) {
    return (
        <DataGridContext.Provider value={{ table, recordCount, tableLayout }}>
            <div className={cn("flex flex-col gap-4", className)}>
                {children}
            </div>
        </DataGridContext.Provider>
    )
}

export function DataGridContainer({ children, className }) {
    return (
        <div className={cn("rounded-md border bg-card", className)}>
            {children}
        </div>
    )
}
