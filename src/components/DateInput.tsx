import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DateInputProps {
  label: string;
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  className?: string;
}

export function DateInput({ label, date, onDateChange, className }: DateInputProps) {
  const [value, setValue] = React.useState(
    date ? date.toISOString().split("T")[0] : ""
  );

  React.useEffect(() => {
    setValue(date ? date.toISOString().split("T")[0] : "");
  }, [date]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (newValue) {
      const newDate = new Date(newValue);
      if (!isNaN(newDate.getTime())) {
        onDateChange(newDate);
      }
    } else {
      onDateChange(undefined);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <Input
        type="date"
        value={value}
        onChange={handleChange}
        className="w-full"
      />
    </div>
  );
}

