import { Button } from "@expense/components/ui/button";
import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <Button
      className="fixed bottom-24 right-4 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg transition-all duration-200 hover:scale-105"
      onClick={onClick}
      data-testid="button-floating-add"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
}
