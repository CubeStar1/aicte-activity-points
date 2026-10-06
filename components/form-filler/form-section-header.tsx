import { Separator } from "@/components/ui/separator";

interface FormSectionHeaderProps {
  title: string;
}

export function FormSectionHeader({ title }: FormSectionHeaderProps) {
  return (
    <div className="space-y-3 pb-4">
      <h3 className="text-2xl font-medium tracking-tight">{title}</h3>
      <Separator />
    </div>
  );
}
