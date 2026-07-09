"use client"

import { useMemo, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import DashboardLayout from "@/components/DashboardLayout"
import {
    DataGrid,
    DataGridContainer,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridTableDnd } from "@/components/reui/data-grid/data-grid-table-dnd"
import {
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getGroupedRowModel,
    getExpandedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { Loader2, ChevronRight, ChevronDown, ChevronsUp, X, Search, Plus, GripVertical, Database, SlidersHorizontal, Save, LayoutTemplate, Download, Calendar, Trash2 } from "lucide-react"

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

import {
    DndContext,
    useDraggable,
    useDroppable,
    closestCenter,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Filter, FileText, Share2, User, ShieldCheckIcon, Users } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
    Alert,
    AlertAction,
    AlertDescription,
} from "@/components/reui/alert"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// komponen dnd untuk sidebar
const DraggableField = ({ id, label, isActive, onToggle }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `field-${id}`,
        data: { label, fieldId: id }
    })

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "px-3 py-1.5 text-xs select-none flex items-center justify-between group rounded-md border transition-all duration-200 cursor-grab active:cursor-grabbing",
                isActive
                    ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border-transparent hover:border-slate-200 dark:hover:border-slate-700",
                isDragging && "opacity-20 translate-x-1"
            )}
        >
            <div
                className="flex items-center gap-2.5 flex-1"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle(id);
                }}
            >
                <div className={cn(
                    "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shadow-sm",
                    isActive ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                )}>
                    {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
                </div>
                <span>{label}</span>
            </div>
            <div className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={12} className="text-slate-400" />
            </div>
        </div>
    )
}

const FilterDropdown = ({ fieldId, label, data, activeFilters, onChange }) => {
    const uniqueValues = useMemo(() => {
        if (!data) return []
        const vals = [...new Set(data.map(item => item[fieldId]))].filter(Boolean)
        return vals.sort()
    }, [data, fieldId])

    const selectedCount = activeFilters[fieldId]?.length || 0

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] flex items-center gap-1 text-slate-500 hover:text-blue-600">
                    <Filter size={10} />
                    {selectedCount > 0 ? `${selectedCount} selected` : 'All'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <DropdownMenuLabel className="text-xs">Filter {label}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                    checked={selectedCount === 0}
                    onCheckedChange={() => onChange(fieldId, [])}
                    className="text-xs"
                >
                    (All)
                </DropdownMenuCheckboxItem>
                <ScrollArea className="h-[200px]">
                    {uniqueValues.map(val => (
                        <DropdownMenuCheckboxItem
                            key={val}
                            checked={activeFilters[fieldId]?.includes(val)}
                            onCheckedChange={(checked) => {
                                const current = activeFilters[fieldId] || []
                                const next = checked
                                    ? [...current, val]
                                    : current.filter(v => v !== val)
                                onChange(fieldId, next)
                            }}
                            className="text-xs"
                        >
                            {val}
                        </DropdownMenuCheckboxItem>
                    ))}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

const DraggableZoneItem = ({ fieldId, label, zoneId, onRemove, renderOptions }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `zoneitem-${zoneId}-${fieldId}`,
        data: { fieldId, label, fromZone: zoneId }
    })

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "flex flex-col p-2.5 rounded shadow-sm border transition-all duration-200 bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/50 cursor-grab active:cursor-grabbing",
                isDragging && "opacity-20 scale-95"
            )}
        >
            <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <span className={cn("text-sm truncate dark:text-slate-200 font-bold")}>
                        {label}
                    </span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                    <X size={14} />
                </button>
            </div>
            {renderOptions && (
                <div className="mt-2 pt-2">
                    {renderOptions}
                </div>
            )}
        </div>
    )
}

const DroppableZone = ({ id, title, children, onItemRemove, itemCount }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `zone-${id}`,
    })

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
            </div>
            <div
                ref={setNodeRef}
                className={cn(
                    "min-h-[44px] border border-dashed rounded-md transition-all duration-200 p-1.5",
                    isOver ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500" : "bg-transparent border-slate-200/60 dark:border-slate-800/60"
                )}
            >
                {children}
                {itemCount === 0 && !isOver && (
                    <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 italic">
                        No fields selected
                    </div>
                )}
            </div>
        </div>
    )
}

// definisi field yang tersedia

const availableFields = [
    { id: "Transaction_ID", label: "Transaction ID", category: "Transaction" },
    { id: "Date", label: "Date", category: "Transaction" },
    { id: "Branch_City", label: "City", category: "Location" },
    { id: "Branch_Region", label: "Region", category: "Location" },
    { id: "Outlet_Name", label: "Outlet", category: "Location" },
    { id: "Product_Name", label: "Product", category: "Product" },
    { id: "SKU_Variant", label: "SKU", category: "Product" },
    { id: "Category", label: "Category", category: "Product" },
    { id: "Qty_Sold", label: "Qty", category: "Logistics" },
    { id: "Price_Per_Unit", label: "Price/Unit", category: "Finance" },
    { id: "Total_Sales", label: "Total Sales", category: "Finance" },
    { id: "Net_Profit", label: "Net Profit", category: "Finance" },
    { id: "COGS_Total", label: "COGS", category: "Finance" },
    { id: "Platform_Fee", label: "Fee", category: "Finance" },
    { id: "Shipping_Cost", label: "Shipping", category: "Finance" },
    { id: "Shipping_Method", label: "Ship Method", category: "Logistics" },
    { id: "Payment_Method", label: "Payment", category: "Customer" },
    { id: "Payment_Status", label: "Status", category: "Customer" },
    { id: "Cust_Demographic", label: "Customer", category: "Customer" },
    { id: "Sales_Channel", label: "Channel", category: "Transaction" },
    { id: "Stock_Remaining", label: "Stock", category: "Logistics" },
    { id: "Waste_Qty", label: "Waste Qty", category: "Logistics" },
    { id: "Waste_Reason", label: "Waste Reason", category: "Logistics" },
]

export default function PivotDashboard() {
    const [pivotData, setPivotData] = useState([])
    const [loading, setLoading] = useState(true)

    // simpan konfigurasi pivot ke localstorage
    const [grouping, setGrouping] = useState(["Branch_City", "Outlet_Name"])
    const [columns_state, setColumnsState] = useState([])
    const [values_state, setValuesState] = useState(["Qty_Sold", "Total_Sales", "Net_Profit"])
    const [filters_state, setFiltersState] = useState([])
    const [activeFilters, setActiveFilters] = useState({})
    const [activeField, setActiveField] = useState(null)
    const [aggregations, setAggregations] = useState({}) // fieldId -> 'SUM'
    const [sortings, setSortings] = useState({}) // fieldId -> 'asc'/'desc'

    // muat awal dari localstorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedGrouping = localStorage.getItem("pivot_grouping")
            const savedColumns = localStorage.getItem("pivot_columns")
            const savedValues = localStorage.getItem("pivot_values")
            const savedFilters = localStorage.getItem("pivot_filters")
            const savedViewsStr = localStorage.getItem("pivot_saved_views")

            if (savedViewsStr) {
                setSavedViews(JSON.parse(savedViewsStr))
            } else {
                const defaultViews = [
                    { id: "1", name: "Executive Summary", department: "Management View", grouping: ["Branch_Region"], columns_state: ["Category"], values_state: ["Total_Sales", "Net_Profit"], filters_state: [], createdBy: "System Administrator", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
                    { id: "2", name: "Logistics Waste Report", department: "Logistik & Inventory", grouping: ["Branch_City", "Outlet_Name"], columns_state: ["Category", "Product_Name"], values_state: ["Waste_Qty"], filters_state: [], createdBy: "Supply Chain Manager", createdAt: new Date(Date.now() - 86400000).toISOString() },
                    { id: "3", name: "Sales Performance Matrix", department: "Sales & Marketing", grouping: ["Branch_Region", "Outlet_Name"], columns_state: ["Sales_Channel"], values_state: ["Qty_Sold", "Total_Sales"], filters_state: [], createdBy: "Head of Marketing", createdAt: new Date().toISOString() },
                ]
                setSavedViews(defaultViews)
                localStorage.setItem("pivot_saved_views", JSON.stringify(defaultViews))
            }

            const legacyMap = {
                "Outlet": "Outlet_Name",
                "City": "Branch_City",
                "Product": "Product_Name",
                "SKU": "SKU_Variant"
            }

            const healKeys = (arr) => arr.map(k => legacyMap[k] || k)

            if (savedGrouping) setGrouping(healKeys(JSON.parse(savedGrouping)))
            if (savedColumns) setColumnsState(healKeys(JSON.parse(savedColumns)))
            if (savedValues) setValuesState(healKeys(JSON.parse(savedValues)))
            if (savedFilters) setFiltersState(JSON.parse(savedFilters))
        }
    }, [])

    // simpan ke localstorage tiap ada perubahan state
    useEffect(() => {
        if (!loading) {
            localStorage.setItem("pivot_grouping", JSON.stringify(grouping))
            localStorage.setItem("pivot_columns", JSON.stringify(columns_state))
            localStorage.setItem("pivot_values", JSON.stringify(values_state))
            localStorage.setItem("pivot_filters", JSON.stringify(filters_state))
            localStorage.setItem("pivot_active_filters", JSON.stringify(activeFilters))
        }
    }, [grouping, columns_state, values_state, filters_state, activeFilters, loading])

    const [user, setUser] = useState(null)
    const [reportMeta, setReportMeta] = useState({ name: "", scope: "personal", format: "csv" })
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

    // state untuk menyimpan tampilan (template)
    const [savedViews, setSavedViews] = useState([])
    const [isSaveViewDialogOpen, setIsSaveViewDialogOpen] = useState(false)
    const [isLoadViewDialogOpen, setIsLoadViewDialogOpen] = useState(false)
    const [newViewName, setNewViewName] = useState("")
    const [newViewDepartment, setNewViewDepartment] = useState("Sales & Marketing")

    const handleSaveView = () => {
        const newView = {
            id: Date.now().toString(),
            name: newViewName || "Untitled View",
            department: newViewDepartment,
            createdBy: user?.user_metadata?.full_name || user?.email || "Current User",
            createdAt: new Date().toISOString(),
            grouping,
            columns_state,
            values_state,
            filters_state
        }
        const updatedViews = [...savedViews, newView]
        setSavedViews(updatedViews)
        localStorage.setItem("pivot_saved_views", JSON.stringify(updatedViews))
        setIsSaveViewDialogOpen(false)
        setNewViewName("")
    }

    const loadView = (viewId) => {
        const view = savedViews.find(v => v.id === viewId)
        if (view) {
            setGrouping(view.grouping || [])
            setColumnsState(view.columns_state || [])
            setValuesState(view.values_state || [])
            setFiltersState(view.filters_state || [])
        }
    }

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()
    }, [])

    const fetchData = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/ingestion/data');
            const result = await res.json();
            if (result.status === 'success' && result.data.raw_data) {
                setPivotData(result.data.raw_data);
            }
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const [expanded, setExpanded] = useState({})
    const [sorting, setSorting] = useState([])
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 })
    const [columnVisibility, setColumnVisibility] = useState({})
    const [searchField, setSearchField] = useState("")
    const [activeCategoryFilter, setActiveCategoryFilter] = useState("All")
    const [showEditor, setShowEditor] = useState(true)
    const [editorWidth, setEditorWidth] = useState(480)

    const handleMouseDown = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = editorWidth;

        const handleMouseMove = (mouseMoveEvent) => {
            let newWidth = startWidth + (mouseMoveEvent.clientX - startX);
            newWidth = Math.max(350, Math.min(newWidth, window.innerWidth - 400));
            setEditorWidth(newWidth);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };

        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    )

    useEffect(() => {
        const down = (e) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                const input = document.getElementById('search-fields-input');
                if (input) input.focus();
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const flattenIds = (cols) => cols.flatMap(c => c.columns ? flattenIds(c.columns) : c.id)

    const { finalData: filteredPivotData, finalColumns: columns } = useMemo(() => {
        if (!pivotData) return { finalData: [], finalColumns: [] }

        let data = pivotData.filter(item => {
            return Object.entries(activeFilters).every(([fieldId, values]) => {
                if (!values || values.length === 0) return true
                return values.includes(item[fieldId])
            })
        })

        // definisi dasar kolom
        const defs = {}
        availableFields.forEach(field => {
            const isNumeric = ["Total_Sales", "Net_Profit", "COGS_Total", "Platform_Fee", "Shipping_Cost", "Price_Per_Unit", "Qty_Sold", "Waste_Qty", "Stock_Remaining"].includes(field.id)
            const agg = aggregations[field.id] || (isNumeric ? "sum" : "unique")

            defs[field.id] = {
                accessorKey: field.id,
                id: field.id,
                header: ({ column }) => <DataGridColumnHeader title={field.label} column={column} />,
                aggregationFn: agg,
            }

            if (["Total_Sales", "Net_Profit", "COGS_Total", "Platform_Fee", "Shipping_Cost", "Price_Per_Unit"].includes(field.id)) {
                defs[field.id].cell = ({ getValue }) => `Rp ${getValue()?.toLocaleString() || 0}`
                defs[field.id].aggregatedCell = ({ getValue }) => (
                    <span className={cn("font-bold", field.id === "Net_Profit" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100")}>
                        Rp {getValue()?.toLocaleString() || 0}
                    </span>
                )
            } else if (["Qty_Sold", "Waste_Qty", "Stock_Remaining"].includes(field.id)) {
                defs[field.id].cell = ({ getValue }) => <div className="text-center w-full">{getValue() || 0}</div>
                defs[field.id].aggregatedCell = ({ getValue }) => (
                    <div className="font-bold text-center w-full text-blue-600 dark:text-blue-400">{getValue() || 0}</div>
                )
            } else {
                defs[field.id].aggregatedCell = ({ getValue }) => {
                    const val = getValue()
                    if (Array.isArray(val)) {
                        return <span className="text-slate-500 italic text-[10px]">{val.length === 1 ? val[0] : `${val.length} values`}</span>
                    }
                    return <span className="text-slate-500">{val || ""}</span>
                }
            }
        })

        const rowLabelsCol = {
            id: "row_labels",
            header: "Row Labels (Baris)",
            footer: () => <div className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest pl-2">Total Keseluruhan</div>,
            aggregationFn: () => "group-header-override",
            aggregatedCell: ({ row }) => {
                const depth = row.depth
                const fieldId = row.groupingColumnId || grouping[0]
                const label = row.getValue(fieldId) || "(Blank)"
                return (
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.25}rem` }}>
                        <button
                            onClick={row.getToggleExpandedHandler()}
                            className="flex flex-shrink-0 items-center justify-center w-5 h-5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                        >
                            {row.getIsExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{label}</span>
                    </div>
                )
            },
            cell: ({ row }) => {
                const depth = row.depth
                return (
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.25 + 1.25}rem` }}>
                        <span className="text-slate-500 dark:text-slate-400 italic font-medium text-xs">Detail Transaksi</span>
                    </div>
                )
            }
        }

        const hiddenGroupCols = grouping.map(gId => defs[gId]).filter(Boolean)

        // jika tidak ada pivot kolom horizontal tampilkan grid standar
        if (columns_state.length === 0 || values_state.length === 0) {
            const cols = grouping.length > 0 ? [...hiddenGroupCols, rowLabelsCol] : []
            const standardCols = availableFields.map(f => {
                const c = defs[f.id]
                if (c.aggregationFn === 'unique') return c
                return {
                    ...c,
                    footer: ({ table }) => {
                        const sum = table.getFilteredRowModel().rows.reduce((acc, row) => acc + (Number(row.getValue(f.id)) || 0), 0)
                        return <div className="font-bold text-center w-full">{sum === 0 ? '-' : sum.toLocaleString()}</div>
                    }
                }
            })
            return { finalData: data, finalColumns: [...cols, ...standardCols] }
        }

        // algoritma reduksi matrix pivot
        const pathConfigsMap = new Map()

        const transformedData = data.map(row => {
            const newRow = { ...row }

            const rowPathKeys = columns_state.map(colId => row[colId] || "(Blank)")
            const pathId = rowPathKeys.join("|||")

            if (!pathConfigsMap.has(pathId)) {
                pathConfigsMap.set(pathId, rowPathKeys)
            }

            values_state.forEach(valId => {
                const dynamicKey = `${pathId}|||${valId}`
                newRow[dynamicKey] = row[valId]
            })

            return newRow
        })

        const uniquePaths = Array.from(pathConfigsMap.entries()).map(([id, keys]) => ({ id, keys }))

        const buildColHierarchy = (levelIdx, pathsList) => {
            if (levelIdx === columns_state.length) {
                return values_state.map(valId => {
                    const originalDef = defs[valId]
                    const cId = `${pathsList[0].id}|||${valId}`
                    return {
                        ...originalDef,
                        id: cId,
                        accessorKey: cId,
                        header: ({ column }) => <div className="font-semibold text-center border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5 mt-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">{availableFields.find(f => f.id === valId)?.label}</div>,
                        footer: ({ table }) => {
                            const sum = table.getFilteredRowModel().rows.reduce((acc, row) => acc + (Number(row.getValue(cId)) || 0), 0)
                            return <div className="font-bold text-center w-full">{sum === 0 ? '0' : sum.toLocaleString()}</div>
                        }
                    }
                })
            }

            const groups = {}
            pathsList.forEach(p => {
                const key = p.keys[levelIdx]
                if (!groups[key]) groups[key] = []
                groups[key].push(p)
            })

            return Object.keys(groups).sort().map(key => ({
                id: `level_${levelIdx}_${key}`,
                header: () => <div className="text-center font-bold text-slate-700 dark:text-slate-300 py-1 border-b border-transparent">{key}</div>,
                columns: buildColHierarchy(levelIdx + 1, groups[key])
            }))
        }

        const pivotCols = buildColHierarchy(0, uniquePaths)

        // total keseluruhan berdasarkan field nilai asli
        const totalsCols = values_state.map(valId => {
            const originalDef = defs[valId]
            const colId = `grand_total_${valId}`
            return {
                ...originalDef,
                id: colId,
                accessorKey: valId,
                header: () => <div className="font-bold text-blue-900 bg-blue-50/80 dark:bg-slate-800 dark:text-blue-100 p-2 text-center whitespace-nowrap">{(aggregations[valId] || "Total").toUpperCase()} {availableFields.find(f => f.id === valId)?.label}</div>,
                cell: ({ getValue }) => <div className="font-bold text-center bg-blue-50/30 dark:bg-slate-800/50 h-full w-full flex items-center justify-center p-2">{originalDef.cell ? originalDef.cell({ getValue }) : getValue()}</div>,
                aggregatedCell: ({ getValue }) => <div className="font-bold text-center bg-blue-50/60 dark:bg-slate-800 h-full w-full flex items-center justify-center p-2">{originalDef.aggregatedCell ? originalDef.aggregatedCell({ getValue }) : getValue()}</div>,
                footer: ({ table }) => {
                    const sum = table.getFilteredRowModel().rows.reduce((acc, row) => acc + (Number(row.getValue(colId)) || 0), 0)
                    return <div className="font-bold text-center w-full">{sum === 0 ? '0' : sum.toLocaleString()}</div>
                }
            }
        })

        const finalCols = grouping.length > 0 ? [...hiddenGroupCols, rowLabelsCol] : []

        return {
            finalData: transformedData,
            finalColumns: [
                ...finalCols,
                ...pivotCols,
                {
                    id: "total_keseluruhan_group",
                    header: () => <div className="text-center font-black text-slate-800 dark:text-slate-100 p-2 border-l-2 border-slate-300 dark:border-slate-700 uppercase tracking-widest text-xs">Total Keseluruhan</div>,
                    columns: totalsCols
                }
            ]
        }
    }, [pivotData, activeFilters, columns_state, values_state, grouping, aggregations])

    useEffect(() => {
        const visible = {}
        const activeFields = [...columns_state, ...values_state]
        availableFields.forEach(f => {
            visible[f.id] = activeFields.includes(f.id)
        })
        if (grouping.length > 0) visible["row_labels"] = true
        setColumnVisibility(visible)

    }, [columns, grouping, columns_state, values_state])

    const handleExportCSV = () => {
        // set nama default berdasarkan grouping saat ini
        const defaultName = `Pivot Report - ${grouping.join(" & ")}`
        setReportMeta({ name: defaultName, scope: "personal", format: "csv" })
        setIsExportDialogOpen(true)
    }

    const confirmExportCSV = () => {
        const headers = availableFields
            .filter(f => columnVisibility[f.id])
            .map(f => f.label)
            .join(",")

        const rows = pivotData.map(row =>
            availableFields
                .filter(f => columnVisibility[f.id])
                .map(f => {
                    const val = row[f.id]
                    return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
                })
                .join(",")
        )

        // header metadata laporan
        const metadata = [
            `# REPORT DATA SUMMARY`,
            `Report Name,${reportMeta.name}`,
            `Created By,${user?.user_metadata?.full_name || user?.email || "Anonymous Account"}`,
            `User Email,${user?.email || "N/A"}`,
            `Created Date,${new Date().toLocaleString()}`,
            `Sharing Scope,${reportMeta.scope === 'personal' ? 'Private (Personal)' : 'Public (Shared)'}`,
            `Total Records,${pivotData.length}`,
            ``,
        ]

        const csvString = metadata.join("\n") + "\n" + headers + "\n" + rows.join("\n")
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)

        const fileExt = reportMeta.format === 'excel' ? 'xlsx' : (reportMeta.format === 'pdf' ? 'pdf' : 'csv')
        link.setAttribute("download", `${reportMeta.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${fileExt}`)

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setIsExportDialogOpen(false)
    }

    const table = useReactTable({
        data: filteredPivotData,
        columns: columns,
        state: { grouping, expanded, sorting, pagination, columnVisibility },
        onGroupingChange: setGrouping,
        onExpandedChange: setExpanded,
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getGroupedRowModel: getGroupedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        autoResetExpanded: false,
    })

    const handleDragStart = (event) => {
        const { active } = event
        const data = active.data.current
        setActiveField(data?.label || "Field")
    }

    const handleDragEndMain = (event) => {
        setActiveField(null)
        const { active, over } = event
        if (!over) return

        const activeIdStr = active.id.toString()
        const overIdStr = over.id.toString()

        // 1. pengurutan ulang kolom di tabel
        if (!activeIdStr.startsWith("field-") && !activeIdStr.startsWith("zoneitem-") && !overIdStr.startsWith("zone-")) {
            if (active.id !== over.id) {
                setColumnOrder((prev) => {
                    const oldIndex = prev.indexOf(active.id)
                    const newIndex = prev.indexOf(over.id)
                    return arrayMove(prev, oldIndex, newIndex)
                })
            }
            return
        }

        // 2. logika editor pivot (tarik ke zona tertentu)
        if (overIdStr.startsWith("zone-") || overIdStr.startsWith("zoneitem-")) {
            const fieldData = active.data.current
            const fieldId = fieldData?.fieldId
            const fromZone = fieldData?.fromZone

            // petakan overid ke zoneid meskipun dijatuhkan pada item
            let targetZoneId = overIdStr.replace("zone-", "")
            if (overIdStr.startsWith("zoneitem-")) {
                targetZoneId = overIdStr.split("-")[1]
            }

            if (!fieldId) return

            // tangani pengurutan ulang internal dalam satu zona
            if (fromZone === targetZoneId) {
                const reorder = (prev) => {
                    const oldIndex = prev.indexOf(fieldId)
                    const overFieldId = overIdStr.startsWith("zoneitem-") ? overIdStr.split("-").slice(2).join("-") : null
                    const newIndex = overFieldId ? prev.indexOf(overFieldId) : prev.length - 1
                    return arrayMove(prev, oldIndex, newIndex)
                }
                if (targetZoneId === "baris") setGrouping(reorder)
                else if (targetZoneId === "kolom") setColumnsState(reorder)
                else if (targetZoneId === "nilai") setValuesState(reorder)
                else if (targetZoneId === "filter") setFiltersState(reorder)
                return
            }

            // jika berpindah zona, hapus dari zona asal terlebih dahulu
            if (fromZone) {
                if (fromZone === "baris") setGrouping(prev => prev.filter(x => x !== fieldId))
                else if (fromZone === "kolom") setColumnsState(prev => prev.filter(x => x !== fieldId))
                else if (fromZone === "nilai") setValuesState(prev => prev.filter(x => x !== fieldId))
                else if (fromZone === "filter") setFiltersState(prev => prev.filter(x => x !== fieldId))
            }

            // tambahkan ke zona tujuan (pastikan tidak ada duplikasi)
            if (targetZoneId === "baris") {
                setGrouping(prev => prev.includes(fieldId) ? prev : [...prev, fieldId])
            } else if (targetZoneId === "kolom") {
                setColumnsState(prev => prev.includes(fieldId) ? prev : [...prev, fieldId])
            } else if (targetZoneId === "nilai") {
                setValuesState(prev => prev.includes(fieldId) ? prev : [...prev, fieldId])
            } else if (targetZoneId === "filter") {
                setFiltersState(prev => prev.includes(fieldId) ? prev : [...prev, fieldId])
            }
        }
    }

    const filteredFields = availableFields.filter(f => {
        const matchesSearch = f.label.toLowerCase().includes(searchField.toLowerCase())
        const matchesCategory = activeCategoryFilter === "All" || f.category === activeCategoryFilter
        return matchesSearch && matchesCategory
    })

    const categories = ["All", ...new Set(availableFields.map(f => f.category))]

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 font-bold text-slate-600 dark:text-slate-400 italic">Exploring Data Patterns...</span>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <DndContext
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEndMain}
                sensors={sensors}
            >
                <div className="px-6 pt-6 pb-0 space-y-6 bg-transparent h-[calc(100vh-20px)] overflow-hidden flex flex-col font-sans">
                    {/* header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-0.5 shrink-0">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                                Smart Pivot Explorer
                            </h1>
                            <p className="text-sm text-muted-foreground dark:text-slate-400">Powering your data-driven decisions with deep drill-down capabilities.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsLoadViewDialogOpen(true)}
                                className="h-9 px-4 text-xs font-semibold bg-background hover:bg-accent border-border transition-all active:scale-95 shadow-sm"
                            >
                                <Database className="w-4 h-4 mr-2 text-indigo-500" />
                                Memory History
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsSaveViewDialogOpen(true)}
                                className="h-9 px-4 text-xs font-semibold bg-background hover:bg-accent border-border transition-all active:scale-95 shadow-sm"
                            >
                                <Save className="w-4 h-4 mr-2 text-emerald-500" />
                                Save View
                            </Button>

                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                            <Button
                                size="sm"
                                onClick={() => setIsExportDialogOpen(true)}
                                className="h-9 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100 transition-all dark:bg-blue-600 dark:hover:bg-blue-500"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV / Excel
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 items-stretch flex-1 min-h-0">
                        {/* editor tabel pivot - sidebar */}
                        {showEditor && (
                            <>
                                <Card
                                    style={{ width: editorWidth, minWidth: editorWidth, maxWidth: editorWidth, transition: 'none' }}
                                    className="shadow-sm border-slate-200 dark:border-slate-800 rounded-b-none overflow-y-auto flex flex-col bg-white dark:bg-slate-900 duration-300 h-full border-b-0 hidden lg:flex"
                                >
                                    <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 transition-colors">
                                        <h2 className="text-lg font-bold dark:text-slate-100">
                                            Editor tabel pivot
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <X
                                                size={16}
                                                className="text-slate-400 cursor-pointer hover:text-red-500 transition-colors"
                                                onClick={() => setShowEditor(false)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-1 min-h-[500px]">
                                        {/* bagian kiri: zona penjatuhan */}
                                        <div className="w-[55%] p-4 space-y-6 border-r dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 transition-colors">
                                            <DroppableZone id="baris" title="Baris" itemCount={grouping.length}>
                                                <div className="space-y-1">
                                                    {grouping.map((g, idx) => (
                                                        <DraggableZoneItem
                                                            key={g}
                                                            fieldId={g}
                                                            label={availableFields.find(f => f.id === g)?.label || g}
                                                            zoneId="baris"
                                                            onRemove={() => setGrouping(prev => prev.filter(x => x !== g))}
                                                            renderOptions={
                                                                <div className="flex flex-col gap-3 w-full">
                                                                    <div className="flex gap-2 w-full">
                                                                        <div className="flex-1 space-y-1">
                                                                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Urutan</span>
                                                                            <select
                                                                                value={sortings[g] || "asc"}
                                                                                onChange={e => setSortings(prev => ({ ...prev, [g]: e.target.value }))}
                                                                                className="w-full text-xs border border-transparent hover:border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 rounded p-1 outline-none text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                                                            >
                                                                                <option value="asc">Menaik</option>
                                                                                <option value="desc">Menurun</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="flex-1 space-y-1">
                                                                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Urutkan menurut</span>
                                                                            <select className="w-full text-xs border border-transparent hover:border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 rounded p-1 outline-none text-slate-700 dark:text-slate-300 transition-colors cursor-pointer">
                                                                                <option value={g}>{availableFields.find(f => f.id === g)?.label || g}</option>
                                                                                {values_state.map(v => {
                                                                                    const aggText = (aggregations[v] || "SUM").toUpperCase()
                                                                                    const fieldLabel = availableFields.find(f => f.id === v)?.label || v
                                                                                    return <option key={v} value={v}>{aggText} {fieldLabel} di...</option>
                                                                                })}
                                                                            </select>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-col gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                                                                        <label className="flex items-center gap-2 cursor-pointer group/chk">
                                                                            <div className="relative flex items-center justify-center w-4 h-4 overflow-hidden rounded-[3px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 group-hover/chk:border-emerald-600 dark:group-hover/chk:border-emerald-500 transition-colors">
                                                                                <input type="checkbox" className="peer sr-only" defaultChecked={true} />
                                                                                <div className="absolute inset-0 bg-emerald-600 text-white scale-0 opacity-0 peer-checked:scale-100 peer-checked:opacity-100 transition-transform flex items-center justify-center">
                                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-xs text-slate-600 dark:text-slate-400">Tampilkan total</span>
                                                                        </label>

                                                                        {idx === 0 && (
                                                                            <label className="flex items-center gap-2 cursor-pointer group/chk mt-0.5">
                                                                                <div className="relative flex items-center justify-center w-4 h-4 overflow-hidden rounded-[3px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 group-hover/chk:border-emerald-600 dark:group-hover/chk:border-emerald-500 transition-colors">
                                                                                    <input type="checkbox" className="peer sr-only" defaultChecked={true} />
                                                                                    <div className="absolute inset-0 bg-emerald-600 text-white scale-0 opacity-0 peer-checked:scale-100 peer-checked:opacity-100 transition-transform flex items-center justify-center">
                                                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                                                    </div>
                                                                                </div>
                                                                                <span className="text-xs text-slate-600 dark:text-slate-400">Ulangi label baris</span>
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </DroppableZone>

                                            <DroppableZone id="kolom" title="Kolom" itemCount={columns_state.length}>
                                                <div className="space-y-1">
                                                    {columns_state.map((g) => (
                                                        <DraggableZoneItem
                                                            key={g}
                                                            fieldId={g}
                                                            label={availableFields.find(f => f.id === g)?.label || g}
                                                            zoneId="kolom"
                                                            onRemove={() => setColumnsState(prev => prev.filter(x => x !== g))}
                                                            renderOptions={
                                                                <div className="flex flex-col gap-3 w-full">
                                                                    <div className="flex gap-2 w-full">
                                                                        <div className="flex-1 space-y-1">
                                                                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Urutan</span>
                                                                            <select
                                                                                value={sortings[g] || "asc"}
                                                                                onChange={e => setSortings(prev => ({ ...prev, [g]: e.target.value }))}
                                                                                className="w-full text-xs border border-transparent hover:border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 rounded p-1 outline-none text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                                                            >
                                                                                <option value="asc">Menaik</option>
                                                                                <option value="desc">Menurun</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="flex-1 space-y-1">
                                                                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Urutkan menurut</span>
                                                                            <select className="w-full text-xs border border-transparent hover:border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 rounded p-1 outline-none text-slate-700 dark:text-slate-300 transition-colors cursor-pointer">
                                                                                <option value={g}>{availableFields.find(f => f.id === g)?.label || g}</option>
                                                                                {values_state.map(v => {
                                                                                    const aggText = (aggregations[v] || "SUM").toUpperCase()
                                                                                    const fieldLabel = availableFields.find(f => f.id === v)?.label || v
                                                                                    return <option key={v} value={v}>{aggText} {fieldLabel} di...</option>
                                                                                })}
                                                                            </select>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-col gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                                                                        <label className="flex items-center gap-2 cursor-pointer group/chk">
                                                                            <div className="relative flex items-center justify-center w-4 h-4 overflow-hidden rounded-[3px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 group-hover/chk:border-emerald-600 dark:group-hover/chk:border-emerald-500 transition-colors">
                                                                                <input type="checkbox" className="peer sr-only" defaultChecked={true} />
                                                                                <div className="absolute inset-0 bg-emerald-600 text-white scale-0 opacity-0 peer-checked:scale-100 peer-checked:opacity-100 transition-transform flex items-center justify-center">
                                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-xs text-slate-600 dark:text-slate-400">Tampilkan total</span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </DroppableZone>

                                            <DroppableZone id="nilai" title="Nilai" itemCount={values_state.length}>
                                                <div className="space-y-1">
                                                    {values_state.map((g) => (
                                                        <DraggableZoneItem
                                                            key={g}
                                                            fieldId={g}
                                                            label={availableFields.find(f => f.id === g)?.label || g}
                                                            zoneId="nilai"
                                                            onRemove={() => setValuesState(prev => prev.filter(x => x !== g))}
                                                            renderOptions={
                                                                <div className="flex gap-2 w-full">
                                                                    <div className="flex-1 space-y-1">
                                                                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Rangkum menurut</span>
                                                                        <select
                                                                            value={aggregations[g] || "sum"}
                                                                            onChange={e => setAggregations(prev => ({ ...prev, [g]: e.target.value }))}
                                                                            className="w-full text-xs border border-transparent hover:border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 rounded p-1 outline-none text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                                                        >
                                                                            <option value="sum">SUM</option>
                                                                            <option value="count">COUNTA</option>
                                                                            <option value="uniqueCount">COUNTUNIQUE</option>
                                                                            <option value="mean">AVERAGE</option>
                                                                            <option value="max">MAX</option>
                                                                            <option value="min">MIN</option>
                                                                            <option value="median">MEDIAN</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex-1 space-y-1">
                                                                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Tampilkan sebagai</span>
                                                                        <select className="w-full text-xs border border-transparent hover:border-slate-300 dark:border-slate-700/50 bg-white dark:bg-slate-900 rounded p-1 outline-none text-slate-700 dark:text-slate-300 transition-colors cursor-pointer">
                                                                            <option value="default">Default</option>
                                                                            <option value="row">% baris</option>
                                                                            <option value="col">% kolom</option>
                                                                            <option value="total">% total keseluruhan</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </DroppableZone>

                                            <DroppableZone id="filter" title="Filter" itemCount={filters_state.length}>
                                                <div className="space-y-1">
                                                    {filters_state.map((g) => (
                                                        <DraggableZoneItem
                                                            key={g}
                                                            fieldId={g}
                                                            label={availableFields.find(f => f.id === g)?.label || g}
                                                            zoneId="filter"
                                                            renderOptions={
                                                                <FilterDropdown
                                                                    fieldId={g}
                                                                    label={availableFields.find(f => f.id === g)?.label || g}
                                                                    data={pivotData}
                                                                    activeFilters={activeFilters}
                                                                    onChange={(fid, vals) => setActiveFilters(prev => ({ ...prev, [fid]: vals }))}
                                                                />
                                                            }
                                                            onRemove={() => setFiltersState(prev => prev.filter(x => x !== g))}
                                                        />
                                                    ))}
                                                </div>
                                            </DroppableZone>
                                        </div>

                                        {/* bagian kanan: daftar field */}
                                        <div className="w-[45%] flex flex-col border-l dark:border-slate-800">
                                            <div className="p-3 border-b dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10 transition-colors flex flex-col gap-3">
                                                <div className="relative group/search-input">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none group-focus-within/search-input:text-blue-500 transition-colors">
                                                        <Search size={14} />
                                                    </div>
                                                    <Input
                                                        id="search-fields-input"
                                                        placeholder="Search fields..."
                                                        className="h-10 pl-9 pr-14 text-xs bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-blue-500/30 transition-all font-medium rounded-lg shadow-sm group-hover/search-input:border-slate-300 dark:group-hover/search-input:border-slate-700"
                                                        value={searchField}
                                                        onChange={(e) => setSearchField(e.target.value)}
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 select-none">
                                                        {searchField && (
                                                            <button
                                                                onClick={() => setSearchField("")}
                                                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* filter field kategori */}
                                                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                                    {categories.map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setActiveCategoryFilter(cat)}
                                                            className={cn(
                                                                "px-2.5 py-1 text-[10px] font-bold rounded-md whitespace-nowrap transition-colors border",
                                                                activeCategoryFilter === cat
                                                                    ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm"
                                                                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                                                            )}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <ScrollArea className="flex-1">
                                                <div className="p-1 space-y-0.5">
                                                    {filteredFields.map(field => {
                                                        const isActive = [...grouping, ...columns_state, ...values_state, ...filters_state].includes(field.id)
                                                        return (
                                                            <DraggableField
                                                                key={field.id}
                                                                id={field.id}
                                                                label={field.label}
                                                                isActive={isActive}
                                                                onToggle={(id) => {
                                                                    if (isActive) {
                                                                        setGrouping(prev => prev.filter(x => x !== id))
                                                                        setColumnsState(prev => prev.filter(x => x !== id))
                                                                        setValuesState(prev => prev.filter(x => x !== id))
                                                                        setFiltersState(prev => prev.filter(x => x !== id))
                                                                    } else {
                                                                        setGrouping(prev => [...prev, id])
                                                                    }
                                                                }}
                                                            />
                                                        )
                                                    })}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </Card>
                                {/* pengubah ukuran yang dapat ditarik */}
                                <div
                                    className="hidden lg:flex w-2 -ml-2 -mr-2 z-10 cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 items-center justify-center transition-colors duration-150"
                                    onMouseDown={handleMouseDown}
                                    title="Tarik untuk memperbesar/memperkecil editor"
                                >
                                    <div className="h-10 w-[3px] bg-slate-300 dark:bg-slate-600 rounded-full group-hover:bg-blue-500" />
                                </div>
                            </>
                        )}

                        {/* penjelajah data drill-down */}
                        <div className="flex flex-col gap-6 h-full flex-1 min-w-0 transition-none">
                            <Card className="flex-1 shadow-sm border-slate-200 dark:border-slate-800 rounded-b-none overflow-hidden bg-white dark:bg-slate-950 flex flex-col transition-colors duration-300 border-b-0">
                                <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-3">
                                            {!showEditor && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setShowEditor(true)}
                                                    className="h-8 px-2 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    <SlidersHorizontal size={12} className="mr-1.5" />
                                                    Editor
                                                </Button>
                                            )}
                                            <h3 className="text-lg font-bold dark:text-slate-100 text-slate-900">
                                                Drill-Down Data Explorer
                                            </h3>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground dark:text-slate-500 font-medium">
                                            Visualizing {filteredPivotData.length} records across {grouping.length} group levels.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setExpanded({})}
                                            className="h-8 px-3 text-[10px] font-bold text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-all gap-1.5 shadow-sm active:scale-95"
                                        >
                                            <ChevronsUp size={12} strokeWidth={3} />
                                            <span className="uppercase tracking-wider">Collapse All</span>
                                        </Button>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground dark:text-slate-400 border-l dark:border-slate-800 pl-4 h-6">
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                Live Sync Aktif
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-0 flex flex-1 flex-col overflow-hidden relative">
                                    <DataGrid
                                        table={table}
                                        recordCount={filteredPivotData.length}
                                        tableLayout={{ cellBorder: true }}
                                        className="flex-1 flex flex-col h-full overflow-hidden gap-0"
                                    >
                                        <div className="flex-1 overflow-auto bg-transparent scrollbar-hide">
                                            <DataGridContainer className="border-none rounded-none dark:bg-slate-950 bg-transparent">
                                                <ScrollArea className="h-full">
                                                    <DataGridTableDnd className="border-separate border-spacing-0" />
                                                    <ScrollBar orientation="horizontal" />
                                                </ScrollArea>
                                            </DataGridContainer>
                                        </div>
                                        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
                                            <DataGridPagination />
                                        </div>
                                    </DataGrid>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                    {/* overlay tarik untuk pergerakan yang mulus */}
                    <DragOverlay dropAnimation={null}>
                        {activeField && (
                            <div className="opacity-90 scale-105 shadow-2xl pointer-events-none z-[9999]">
                                <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded border border-blue-500 text-[11px] font-bold text-blue-600 shadow-xl min-w-[120px] flex items-center gap-2">
                                    <GripVertical size={12} className="text-blue-400" />
                                    {activeField}
                                </div>
                            </div>
                        )}
                    </DragOverlay>
                </div>
            </DndContext>

            {/* dialog ekspor laporan */}
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-2xl overflow-hidden">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold dark:text-slate-100">
                            <Share2 className="w-4 h-4 text-blue-500" />
                            Save & Export Report
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                            Set your report details before downloading.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-0">
                        {/* bagian nama laporan */}
                        <div className="space-y-1.5">
                            <Label htmlFor="report-name" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                REPORT NAME
                            </Label>
                            <Input
                                id="report-name"
                                value={reportMeta.name}
                                onChange={(e) => setReportMeta({ ...reportMeta, name: e.target.value })}
                                className="h-10 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-blue-500/30 text-sm font-medium transition-all"
                                placeholder="Enter report name..."
                            />
                        </div>

                        {/* bagian lingkup berbagi */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                SHARING SCOPE
                            </Label>
                            <RadioGroup
                                value={reportMeta.scope}
                                onValueChange={(val) => setReportMeta({ ...reportMeta, scope: val })}
                                className="grid grid-cols-3 gap-3"
                            >
                                <div>
                                    <RadioGroupItem value="personal" id="personal" className="peer sr-only" />
                                    <Label
                                        htmlFor="personal"
                                        className={cn(
                                            "flex flex-col items-center justify-center h-24 rounded-lg border p-3 transition-all duration-200 cursor-pointer text-center",
                                            "border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                            "peer-data-[state=checked]:border-blue-500 dark:peer-data-[state=checked]:border-blue-500/50 peer-data-[state=checked]:bg-blue-50/10 dark:peer-data-[state=checked]:bg-blue-500/5"
                                        )}
                                    >
                                        <User className={cn(
                                            "mb-2 h-5 w-5 transition-colors",
                                            reportMeta.scope === 'personal' ? "text-blue-500" : "text-slate-400"
                                        )} />
                                        <span className="text-xs font-semibold dark:text-slate-200">Personal</span>
                                        <span className="text-[10px] text-slate-500 mt-0.5">Only you</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="team" id="team" className="peer sr-only" />
                                    <Label
                                        htmlFor="team"
                                        className={cn(
                                            "flex flex-col items-center justify-center h-24 rounded-lg border p-3 transition-all duration-200 cursor-pointer text-center",
                                            "border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                            "peer-data-[state=checked]:border-blue-500 dark:peer-data-[state=checked]:border-blue-500/50 peer-data-[state=checked]:bg-blue-50/10 dark:peer-data-[state=checked]:bg-blue-500/5"
                                        )}
                                    >
                                        <Users className={cn(
                                            "mb-2 h-5 w-5 transition-colors",
                                            reportMeta.scope === 'team' ? "text-blue-500" : "text-slate-400"
                                        )} />
                                        <span className="text-xs font-semibold dark:text-slate-200">Team</span>
                                        <span className="text-[10px] text-slate-500 mt-0.5">Entity</span>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="all" id="all" className="peer sr-only" />
                                    <Label
                                        htmlFor="all"
                                        className={cn(
                                            "flex flex-col items-center justify-center h-24 rounded-lg border p-3 transition-all duration-200 cursor-pointer text-center",
                                            "border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                            "peer-data-[state=checked]:border-blue-500 dark:peer-data-[state=checked]:border-blue-500/50 peer-data-[state=checked]:bg-blue-50/10 dark:peer-data-[state=checked]:bg-blue-500/5"
                                        )}
                                    >
                                        <Share2 className={cn(
                                            "mb-2 h-5 w-5 transition-colors",
                                            reportMeta.scope === 'all' ? "text-blue-500" : "text-slate-400"
                                        )} />
                                        <span className="text-xs font-semibold dark:text-slate-200">Everyone</span>
                                        <span className="text-[10px] text-slate-500 mt-0.5">Public</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* pemilihan format (hanya terlihat untuk lingkup semua orang/publik) */}
                        {reportMeta.scope === 'all' && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                                    EXPORT FORMAT (PUBLIC VIEW)
                                </Label>
                                <RadioGroup
                                    value={reportMeta.format}
                                    onValueChange={(val) => setReportMeta({ ...reportMeta, format: val })}
                                    className="flex gap-3"
                                >
                                    {['csv', 'excel', 'pdf'].map(fmt => (
                                        <div key={fmt} className="flex-1">
                                            <RadioGroupItem value={fmt} id={`format-${fmt}`} className="peer sr-only" />
                                            <Label
                                                htmlFor={`format-${fmt}`}
                                                className={cn(
                                                    "flex items-center justify-center py-2.5 rounded-lg border transition-all duration-200 cursor-pointer text-center",
                                                    "border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                                    "peer-data-[state=checked]:border-emerald-500 dark:peer-data-[state=checked]:border-emerald-500/50 peer-data-[state=checked]:bg-emerald-50/10 dark:peer-data-[state=checked]:bg-emerald-500/5"
                                                )}
                                            >
                                                <span className={cn("text-[11px] font-bold uppercase", reportMeta.format === fmt ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400")}>{fmt}</span>
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        )}

                        {/* peringatan kredensial */}
                        <Alert className="border-blue-500/20 dark:border-blue-400/10 bg-blue-50/30 dark:bg-blue-900/20 py-3 shadow-none mt-1">
                            <ShieldCheckIcon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <AlertDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                                    Signed by: <span className="text-slate-900 dark:text-slate-100 font-bold">{user?.user_metadata?.full_name || user?.email || "Rafael"}</span>.
                                </AlertDescription>
                            </div>
                        </Alert>
                    </div>

                    <DialogFooter className="mt-4 flex items-center justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setIsExportDialogOpen(false)}
                            className="font-medium"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmExportCSV}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
                        >
                            Generate Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isSaveViewDialogOpen} onOpenChange={setIsSaveViewDialogOpen}>
                <DialogContent className="sm:max-w-[450px] border-slate-200 dark:border-slate-800 shadow-2xl">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                            <Save className="w-5 h-5 text-emerald-500" />
                            Save Report Template
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            Save this Pivot layout configuration as a template to easily load it later and share it with specific departments.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="view-name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">REPORT NAME</Label>
                            <Input
                                id="view-name"
                                value={newViewName}
                                onChange={(e) => setNewViewName(e.target.value)}
                                placeholder="e.g., Weekly Logistics Waste"
                                className="h-10 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus-visible:ring-emerald-500/30 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">DEPARTMENT ACCESS</Label>
                            <RadioGroup value={newViewDepartment} onValueChange={setNewViewDepartment} className="grid grid-cols-1 gap-2">
                                {[
                                    { id: "logistics", label: "Logistik & Inventory", desc: "For inventory management teams" },
                                    { id: "sales", label: "Sales & Marketing", desc: "For performance tracking" },
                                    { id: "management", label: "Management View", desc: "High-level strategic reports" }
                                ].map((dept) => (
                                    <div key={dept.id}>
                                        <RadioGroupItem value={dept.label} id={`dept-${dept.id}`} className="peer sr-only" />
                                        <Label
                                            htmlFor={`dept-${dept.id}`}
                                            className={cn(
                                                "flex flex-col items-start justify-center p-3 rounded-xl border transition-all duration-200 cursor-pointer",
                                                "border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                                "peer-data-[state=checked]:border-emerald-500 dark:peer-data-[state=checked]:border-emerald-500/50 peer-data-[state=checked]:bg-emerald-50/10 dark:peer-data-[state=checked]:bg-emerald-500/5"
                                            )}
                                        >
                                            <span className="text-sm font-bold dark:text-slate-200 leading-tight">{dept.label}</span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5">{dept.desc}</span>
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                    <DialogFooter className="mt-4 gap-3">
                        <Button variant="ghost" onClick={() => setIsSaveViewDialogOpen(false)} className="font-semibold">Cancel</Button>
                        <Button onClick={handleSaveView} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md px-6 transition-all active:scale-95">Save Template</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isLoadViewDialogOpen} onOpenChange={setIsLoadViewDialogOpen}>
                <DialogContent className="sm:max-w-[750px] max-h-[85vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl">
                    <div className="p-6 pb-4 bg-background dark:bg-slate-950 border-b border-border">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
                                <div className="p-1.5 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20">
                                    <Database className="w-5 h-5 text-indigo-500" />
                                </div>
                                Pivot Memory History
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                Jelajahi log memory konfigurasi pivot yang dibagikan antar department dari author lain.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <ScrollArea className="max-h-[60vh] bg-slate-50/50 dark:bg-slate-900/20">
                        <div className="p-6 space-y-4">
                            {savedViews.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                        <Database className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No History Available</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Simpan konfigurasi pivot Anda sebagai template pertama.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {savedViews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map(view => (
                                        <Card key={view.id} className="group relative overflow-hidden bg-card border-border hover:border-indigo-500/50 hover:shadow-md transition-all duration-200">
                                            <div className="p-4">
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                    <div className="space-y-3 flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">{view.name}</h4>
                                                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 transition-colors">
                                                                {view.department}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                                <div className="p-1 rounded-full bg-slate-100 dark:bg-slate-800">
                                                                    <User className="w-3 h-3" />
                                                                </div>
                                                                {view.createdBy || "System"}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                                <div className="p-1 rounded-full bg-slate-100 dark:bg-slate-800">
                                                                    <Calendar className="w-3 h-3" />
                                                                </div>
                                                                {view.createdAt ? new Date(view.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 pt-1">
                                                            {[
                                                                { label: 'Baris', count: view.grouping?.length || 0 },
                                                                { label: 'Kolom', count: view.columns_state?.length || 0 },
                                                                { label: 'Nilai', count: view.values_state?.length || 0 }
                                                            ].map((stat, i) => (
                                                                <div key={i} className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 transition-all">
                                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{stat.label}:</span>
                                                                    <span className="text-[10px] font-semibold text-slate-900 dark:text-slate-100">{stat.count}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 sm:mt-1 lg:opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSavedViews(prev => {
                                                                    const updated = prev.filter(v => v.id !== view.id)
                                                                    localStorage.setItem("pivot_saved_views", JSON.stringify(updated))
                                                                    return updated
                                                                })
                                                            }}
                                                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                            title="Hapus memory history"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => { loadView(view.id); setIsLoadViewDialogOpen(false) }}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md text-[11px] font-bold px-4 h-8 transition-all hover:scale-105 active:scale-95"
                                                        >
                                                            Load View
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
