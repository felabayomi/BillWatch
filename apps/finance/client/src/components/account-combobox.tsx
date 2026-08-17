import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type AccountWithBalance } from "@shared/schema";

interface AccountComboboxProps {
  accounts: AccountWithBalance[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
}

export function AccountCombobox({ 
  accounts, 
  value, 
  onValueChange, 
  placeholder = "Select account...", 
  disabled = false,
  testId 
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false);
  
  // Sort accounts alphabetically by name
  const sortedAccounts = [...accounts].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  
  const selectedAccount = sortedAccounts.find(account => account.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 text-left font-normal"
          disabled={disabled}
          data-testid={testId}
        >
          {selectedAccount ? (
            <div className="flex items-center justify-between w-full">
              <span className="truncate">{selectedAccount.name}</span>
              <span className="text-sm text-muted-foreground ml-2 flex-shrink-0">
                ${(selectedAccount.currentBalanceCents / 100).toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search accounts..." 
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>No accounts found.</CommandEmpty>
            <CommandGroup>
              {sortedAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.name} ${account.institution || ''}`}
                  onSelect={() => {
                    onValueChange(account.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === account.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{account.name}</span>
                      {account.institution && (
                        <span className="text-xs text-muted-foreground">
                          {account.institution}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">
                    ${(account.currentBalanceCents / 100).toFixed(2)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}