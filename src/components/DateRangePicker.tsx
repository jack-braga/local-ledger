import * as React from "react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { DateInput } from "@/components/DateInput";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  onUpdate: (values: {
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
    compareFrom?: Date | undefined;
    compareTo?: Date | undefined;
  }) => void;
  initialDateFrom?: Date | string;
  initialDateTo?: Date | string;
  initialCompareFrom?: Date | string;
  initialCompareTo?: Date | string;
  align?: "start" | "center" | "end";
  locale?: string;
  showCompare?: boolean;
}

const PRESET_RANGES = [
  { label: "Today", value: 0 },
  { label: "Yesterday", value: 1 },
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 6 months", value: 180 },
  { label: "Last year", value: 365 },
];

export function DateRangePicker({
  onUpdate,
  initialDateFrom,
  initialDateTo,
  initialCompareFrom,
  initialCompareTo,
  align = "end",
  locale = "en-US",
  showCompare = true,
}: DateRangePickerProps) {
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(
    initialDateFrom
      ? typeof initialDateFrom === "string"
        ? new Date(initialDateFrom)
        : initialDateFrom
      : undefined
  );
  const [dateTo, setDateTo] = React.useState<Date | undefined>(
    initialDateTo
      ? typeof initialDateTo === "string"
        ? new Date(initialDateTo)
        : initialDateTo
      : undefined
  );
  const [compareFrom, setCompareFrom] = React.useState<Date | undefined>(
    initialCompareFrom
      ? typeof initialCompareFrom === "string"
        ? new Date(initialCompareFrom)
        : initialCompareFrom
      : undefined
  );
  const [compareTo, setCompareTo] = React.useState<Date | undefined>(
    initialCompareTo
      ? typeof initialCompareTo === "string"
        ? new Date(initialCompareTo)
        : initialCompareTo
      : undefined
  );
  const [compareEnabled, setCompareEnabled] = React.useState(
    showCompare && (!!initialCompareFrom || !!initialCompareTo)
  );

  const dateRange: DateRange | undefined = React.useMemo(() => {
    if (dateFrom && dateTo) {
      return { from: dateFrom, to: dateTo };
    }
    if (dateFrom) {
      return { from: dateFrom, to: dateFrom };
    }
    return undefined;
  }, [dateFrom, dateTo]);

  React.useEffect(() => {
    onUpdate({
      dateFrom,
      dateTo,
      compareFrom: compareEnabled ? compareFrom : undefined,
      compareTo: compareEnabled ? compareTo : undefined,
    });
  }, [dateFrom, dateTo, compareFrom, compareTo, compareEnabled, onUpdate]);

  const handlePresetClick = (days: number) => {
    const today = endOfDay(new Date());
    let from: Date;
    let to: Date = today;

    if (days === 0) {
      from = startOfDay(new Date());
      to = endOfDay(new Date());
    } else if (days === 1) {
      from = startOfDay(subDays(today, 1));
      to = endOfDay(subDays(today, 1));
    } else {
      from = startOfDay(subDays(today, days - 1));
      to = endOfDay(today);
    }

    setDateFrom(from);
    setDateTo(to);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      setDateFrom(range.from);
    } else {
      setDateFrom(undefined);
    }
    if (range?.to) {
      setDateTo(range.to);
    } else {
      setDateTo(undefined);
    }
  };

  const formatDateRange = () => {
    if (dateFrom && dateTo) {
      if (dateFrom.getTime() === dateTo.getTime()) {
        return format(dateFrom, "PPP");
      }
      return `${format(dateFrom, "LLL dd, y")} - ${format(dateTo, "LLL dd, y")}`;
    }
    if (dateFrom) {
      return format(dateFrom, "PPP");
    }
    return "Pick a date range";
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !dateFrom && !dateTo && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left side: Calendar and Date Inputs */}
            <div className="flex-1 space-y-4">
              {/* Calendar */}
              <div className="space-y-2">
                <Label>Calendar</Label>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleCalendarSelect}
                  numberOfMonths={2}
                  initialFocus
                />
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <DateInput
                  label="From"
                  date={dateFrom}
                  onDateChange={setDateFrom}
                />
                <DateInput
                  label="To"
                  date={dateTo}
                  onDateChange={setDateTo}
                />
              </div>

              {/* Compare Toggle */}
              {showCompare && (
                <div className="flex items-center justify-between space-x-2 border-t pt-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="compare">Compare</Label>
                    <p className="text-xs text-muted-foreground">
                      Compare to previous period
                    </p>
                  </div>
                  <Switch
                    id="compare"
                    checked={compareEnabled}
                    onCheckedChange={setCompareEnabled}
                  />
                </div>
              )}

              {/* Compare Date Inputs */}
              {showCompare && compareEnabled && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <DateInput
                    label="Compare From"
                    date={compareFrom}
                    onDateChange={setCompareFrom}
                  />
                  <DateInput
                    label="Compare To"
                    date={compareTo}
                    onDateChange={setCompareTo}
                  />
                </div>
              )}
            </div>

            {/* Right side: Preset Ranges (on wider screens) */}
            <div className="lg:border-l lg:pl-4 space-y-2 lg:min-w-[200px]">
              <Label>Presets</Label>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {PRESET_RANGES.map((preset) => (
                  <Button
                    key={preset.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetClick(preset.value)}
                    className="text-xs w-full"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

