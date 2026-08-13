import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface ReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (preferences: ReminderPreferences) => void;
  initialPreferences?: ReminderPreferences;
}

export interface ReminderPreferences {
  twoWeeks: boolean;
  oneWeek: boolean;
  threeDays: boolean;
  oneDay: boolean;
  sameDay: boolean;
  notificationTime: string;
}

const defaultPreferences: ReminderPreferences = {
  twoWeeks: true,
  oneWeek: true,
  threeDays: true,
  oneDay: true,
  sameDay: true,
  notificationTime: "09:00",
};

export function ReminderModal({ 
  open, 
  onOpenChange, 
  onSave, 
  initialPreferences = defaultPreferences 
}: ReminderModalProps) {
  const [preferences, setPreferences] = useState<ReminderPreferences>(initialPreferences);

  const handleSave = () => {
    onSave(preferences);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setPreferences(initialPreferences);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto slide-up" data-testid="reminder-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Set Reminders
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancel}
              data-testid="button-close-reminder-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Choose reminder times:
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="twoWeeks"
                  checked={preferences.twoWeeks}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, twoWeeks: checked as boolean }))
                  }
                  data-testid="checkbox-two-weeks"
                />
                <label htmlFor="twoWeeks" className="text-sm text-foreground">
                  2 weeks before due date
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="oneWeek"
                  checked={preferences.oneWeek}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, oneWeek: checked as boolean }))
                  }
                  data-testid="checkbox-one-week"
                />
                <label htmlFor="oneWeek" className="text-sm text-foreground">
                  1 week before due date
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="threeDays"
                  checked={preferences.threeDays}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, threeDays: checked as boolean }))
                  }
                  data-testid="checkbox-three-days"
                />
                <label htmlFor="threeDays" className="text-sm text-foreground">
                  3 days before due date
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="oneDay"
                  checked={preferences.oneDay}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, oneDay: checked as boolean }))
                  }
                  data-testid="checkbox-one-day"
                />
                <label htmlFor="oneDay" className="text-sm text-foreground">
                  1 day before due date
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="sameDay"
                  checked={preferences.sameDay}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, sameDay: checked as boolean }))
                  }
                  data-testid="checkbox-same-day"
                />
                <label htmlFor="sameDay" className="text-sm text-foreground">
                  On due date
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Notification time:
            </label>
            <Select 
              value={preferences.notificationTime} 
              onValueChange={(value) => 
                setPreferences(prev => ({ ...prev, notificationTime: value }))
              }
            >
              <SelectTrigger data-testid="select-notification-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="09:00">9:00 AM</SelectItem>
                <SelectItem value="12:00">12:00 PM</SelectItem>
                <SelectItem value="18:00">6:00 PM</SelectItem>
                <SelectItem value="custom">Custom time...</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={handleCancel}
              data-testid="button-cancel-reminder"
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSave}
              data-testid="button-save-reminder"
            >
              Save Reminders
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
