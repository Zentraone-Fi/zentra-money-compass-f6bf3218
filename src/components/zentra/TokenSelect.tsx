import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Asset } from "@/lib/zentra/types";
import { TokenIcon } from "./TokenIcon";

export function TokenSelect({ assets, value, onChange, label }: {
  assets: Asset[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-10 w-[140px] shrink-0 rounded-full border-panel-border bg-panel">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-panel-border bg-popover">
        {assets.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            <span className="flex items-center gap-2">
              <TokenIcon kind={a.icon} className="size-5" /> {a.symbol}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
