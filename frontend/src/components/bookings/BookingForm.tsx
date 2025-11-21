import { useState, FormEvent } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Clock, Calendar as CalendarIcon, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  serviceId: string;
  serviceTitle: string;
  defaultPrice: number | null;
  expressPrice: number | null;
  onSuccess?: (bookingId: string) => void;
  onCancel?: () => void;
}

// Generate time slots from 9 AM to 9 PM in 30-minute intervals
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 9; hour <= 21; hour++) {
    const hourStr = hour.toString().padStart(2, '0');
    slots.push(`${hourStr}:00`);
    if (hour < 21) {
      slots.push(`${hourStr}:30`);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export const BookingForm = ({
  serviceId,
  serviceTitle,
  defaultPrice,
  expressPrice,
  onSuccess,
  onCancel,
}: BookingFormProps) => {
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [preferredTimeNote, setPreferredTimeNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // If scheduling for later, validate date/time
    if (scheduleForLater) {
      if (!selectedDate) {
        setError("Please select a date or uncheck 'Schedule for later'");
        return;
      }

      if (!selectedTime) {
        setError("Please select a time or uncheck 'Schedule for later'");
        return;
      }

      // Validate date is in future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);

      if (selected < today) {
        setError("Booking date must be in the future");
        return;
      }

      // Validate if selected date is today, time must be in future
      if (selected.getTime() === today.getTime()) {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const bookingDateTime = new Date();
        bookingDateTime.setHours(hours, minutes, 0, 0);
        
        if (bookingDateTime < new Date()) {
          setError("Booking time must be in the future");
          return;
        }
      }
    }

    setLoading(true);

    try {
      // Format date/time - can be null for instant bookings
      const dateStr = scheduleForLater && selectedDate 
        ? format(selectedDate, "yyyy-MM-dd") 
        : null;
      const timeStr = scheduleForLater && selectedTime 
        ? selectedTime 
        : null;

      const result = await api.bookings.create({
        serviceId,
        date: dateStr,
        time: timeStr,
        note: preferredTimeNote || null, // Optional note for preferred time
      }) as any;

      if (result.status === 201) {
        toast.success("Booking created successfully!");
        onSuccess?.(result.data.id);
      } else {
        const errorMessage = result.msg || "Failed to create booking";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to create booking";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Service Info */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Service</Label>
        <p className="text-sm text-muted-foreground">{serviceTitle}</p>
      </div>

      {/* Price Display */}
      {(defaultPrice || expressPrice) && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-2">
            {defaultPrice && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Default Price</span>
                <span className="font-semibold">GH₵{defaultPrice.toFixed(2)}</span>
              </div>
            )}
            {expressPrice && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Express Price</span>
                <span className="font-semibold">GH₵{expressPrice.toFixed(2)}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Schedule Option */}
      <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-md">
        <Checkbox
          id="schedule"
          checked={scheduleForLater}
          onCheckedChange={(checked) => {
            setScheduleForLater(checked === true);
            if (!checked) {
              setSelectedDate(undefined);
              setSelectedTime("");
            }
          }}
        />
        <Label
          htmlFor="schedule"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Schedule for a specific date and time
        </Label>
      </div>

      {/* Date & Time Pickers - Only show if scheduling */}
      {scheduleForLater && (
        <>
          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Select Date *
            </Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < today}
                className="rounded-md border"
              />
            </div>
            {selectedDate && (
              <p className="text-sm text-muted-foreground text-center">
                Selected: {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
            )}
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Select Time *
            </Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTime && (
              <p className="text-sm text-muted-foreground">
                Selected: {format(new Date(`2000-01-01T${selectedTime}`), "h:mm a")}
              </p>
            )}
          </div>
        </>
      )}

      {/* Preferred Time Note (Optional) */}
      {!scheduleForLater && (
        <div className="space-y-2">
          <Label htmlFor="note" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Preferred Date/Time (Optional)
          </Label>
          <Textarea
            id="note"
            placeholder="E.g., 'Anytime this week' or 'Prefer mornings'..."
            value={preferredTimeNote}
            onChange={(e) => setPreferredTimeNote(e.target.value)}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            Let the seller know if you have a preferred time for this service
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || (scheduleForLater && (!selectedDate || !selectedTime))}
          className={cn("flex-1", !onCancel && "w-full")}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Booking...
            </>
          ) : (
            "Confirm Booking"
          )}
        </Button>
      </div>
    </form>
  );
};

