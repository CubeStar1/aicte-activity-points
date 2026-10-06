"use client";

import { UseFormRegister } from "react-hook-form";
import { FormFillerData } from "@/lib/types/form-filler";
import { Input } from "@/components/ui/input";
import { FormSectionHeader } from "./form-section-header";

interface SignatoriesFormProps {
  register: UseFormRegister<FormFillerData>;
}

const SIGNATORIES = [
  { key: "evaluator1", label: "Evaluator 1" },
  { key: "evaluator2", label: "Evaluator 2" },
  { key: "counsellor", label: "Counsellor" },
] as const;

export function SignatoriesForm({ register }: SignatoriesFormProps) {
  return (
    <div>
      <FormSectionHeader title="Signatories" />
      <div className="divide-y rounded-xl border bg-card">
        {SIGNATORIES.map(({ key, label }) => (
          <div
            key={key}
            role="group"
            aria-label={label}
            className="grid gap-2 p-4 @lg:grid-cols-[7rem_1fr] @lg:items-center @lg:gap-4 @lg:px-5"
          >
            <span className="text-sm font-medium">{label}</span>
            <div className="grid grid-cols-2 gap-2">
              <Input
                {...register(`signatories.${key}.name`)}
                placeholder="Name"
                aria-label={`${label} name`}
              />
              <Input
                {...register(`signatories.${key}.designation`)}
                placeholder="Designation"
                aria-label={`${label} designation`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
