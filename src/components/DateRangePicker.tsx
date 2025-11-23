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
  dateFrom?: Date | string;
  dateTo?: Date | string;
  compareFrom?: Date | string;
  compareTo?: Date | string;
  align?: "start" | "center" | "end";
  locale?: string;
  showCompare?: boolean;
}

const PRESET_RANGES: Array<{ label: string; value: number | "clear" }> = [
  { label: "Clear", value: "clear" },
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
  dateFrom: dateFromProp,
  dateTo: dateToProp,
  compareFrom: compareFromProp,
  compareTo: compareToProp,
  align = "end",
  locale = "en-US",
  showCompare = true,
}: DateRangePickerProps) {
  // Convert props to Date objects if they're strings
  const dateFrom = React.useMemo(() => {
    if (!dateFromProp) return undefined;
    return typeof dateFromProp === "string" ? new Date(dateFromProp) : dateFromProp;
  }, [dateFromProp]);

  const dateTo = React.useMemo(() => {
    if (!dateToProp) return undefined;
    return typeof dateToProp === "string" ? new Date(dateToProp) : dateToProp;
  }, [dateToProp]);

  const compareFrom = React.useMemo(() => {
    if (!compareFromProp) return undefined;
    return typeof compareFromProp === "string" ? new Date(compareFromProp) : compareFromProp;
  }, [compareFromProp]);

  const compareTo = React.useMemo(() => {
    if (!compareToProp) return undefined;
    return typeof compareToProp === "string" ? new Date(compareToProp) : compareToProp;
  }, [compareToProp]);

  const [compareEnabled, setCompareEnabled] = React.useState(
    showCompare && (!!compareFromProp || !!compareToProp)
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

  const handlePresetClick = (value: number | "clear") => {
    // Handle Clear preset
    if (value === "clear") {
      onUpdate({
        dateFrom: undefined,
        dateTo: undefined,
        compareFrom: undefined,
        compareTo: undefined,
      });
      return;
    }

    // Handle numeric day presets
    const days = value;
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

    onUpdate({
      dateFrom: from,
      dateTo: to,
      compareFrom: undefined,
      compareTo: undefined,
    });
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    const newDateFrom = range?.from ? range.from : undefined;
    const newDateTo = range?.to ? range.to : undefined;
    
    onUpdate({
      dateFrom: newDateFrom,
      dateTo: newDateTo,
      compareFrom: compareEnabled ? compareFrom : undefined,
      compareTo: compareEnabled ? compareTo : undefined,
    });
  };

  const handleDateFromChange = (newDate: Date | undefined) => {
    onUpdate({
      dateFrom: newDate,
      dateTo,
      compareFrom: compareEnabled ? compareFrom : undefined,
      compareTo: compareEnabled ? compareTo : undefined,
    });
  };

  const handleDateToChange = (newDate: Date | undefined) => {
    onUpdate({
      dateFrom,
      dateTo: newDate,
      compareFrom: compareEnabled ? compareFrom : undefined,
      compareTo: compareEnabled ? compareTo : undefined,
    });
  };

  const handleCompareFromChange = (newDate: Date | undefined) => {
    onUpdate({
      dateFrom,
      dateTo,
      compareFrom: newDate,
      compareTo: compareEnabled ? compareTo : undefined,
    });
  };

  const handleCompareToChange = (newDate: Date | undefined) => {
    onUpdate({
      dateFrom,
      dateTo,
      compareFrom: compareEnabled ? compareFrom : undefined,
      compareTo: newDate,
    });
  };

  const handleCompareEnabledChange = (enabled: boolean) => {
    setCompareEnabled(enabled);
    onUpdate({
      dateFrom,
      dateTo,
      compareFrom: enabled ? compareFrom : undefined,
      compareTo: enabled ? compareTo : undefined,
    });
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
                  onDateChange={handleDateFromChange}
                />
                <DateInput
                  label="To"
                  date={dateTo}
                  onDateChange={handleDateToChange}
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
                    onCheckedChange={handleCompareEnabledChange}
                  />
                </div>
              )}

              {/* Compare Date Inputs */}
              {showCompare && compareEnabled && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <DateInput
                    label="Compare From"
                    date={compareFrom}
                    onDateChange={handleCompareFromChange}
                  />
                  <DateInput
                    label="Compare To"
                    date={compareTo}
                    onDateChange={handleCompareToChange}
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

