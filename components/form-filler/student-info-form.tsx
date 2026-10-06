"use client";

import { Control, UseFormRegister, UseFormSetValue, useWatch } from "react-hook-form";
import { FormFillerData, DEPARTMENTS } from "@/lib/types/form-filler";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSectionHeader } from "./form-section-header";

interface StudentInfoFormProps {
  control: Control<FormFillerData>;
  register: UseFormRegister<FormFillerData>;
  setValue: UseFormSetValue<FormFillerData>;
}

export function StudentInfoForm({
  control,
  register,
  setValue,
}: StudentInfoFormProps) {
  const department = useWatch({ control, name: "student.department" });

  return (
    <div>
      <FormSectionHeader title="Student Information" />
      <div className="rounded-xl border bg-card p-4 @lg:p-5">
        <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Student Name</Label>
            <Input
              id="name"
              {...register("student.name")}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usn">USN</Label>
            <Input
              id="usn"
              {...register("student.usn")}
              placeholder="e.g., 1RV22CS001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={department || ""}
              onValueChange={(value) => setValue("student.department", value)}
            >
              <SelectTrigger id="department" className="w-full">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Programme Period</Label>
            <Input
              id="period"
              {...register("student.period")}
              placeholder="e.g., 2022-2026"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
