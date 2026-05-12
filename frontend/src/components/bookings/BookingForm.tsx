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

interface ServicePackage {
  name: string;
  price: number;
  description?: string;
}

interface BookingFormProps {
  serviceId: string;
  serviceTitle: string;
  defaultPrice: number | null;
  expressPrice: number | null;
  pricingType?: 'fixed' | 'range' | 'packages';
  priceMin?: number | null;
  priceMax?: number | null;
  servicePackages?: ServicePackage[];
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
  pricingType = 'fixed',
  priceMin,
  priceMax,
  servicePackages = [],
  onSuccess,
  onCancel,
}: BookingFormProps) => {
  const isRange = pricingType === 'range';
  const isPackages = pricingType === 'packages';
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [preferredTimeNote, setPreferredTimeNote] = useState<string>("");
  const [buyerRequirements, setBuyerRequirements] = useState<string>("");
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
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

    if (isRange && !buyerRequirements.trim()) {
      setError("Please describe what you need so the seller can quote you accurately.");
      return;
    }

    if (isPackages && !selectedPackage) {
      setError("Please select a package to continue.");
      return;
    }

    setLoading(true);

    try {
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
        note: preferredTimeNote || null,
        buyer_requirements: isRange ? buyerRequirements.trim() : null,
        selected_package_name: isPackages ? selectedPackage!.name : null,
      }) as any;

      if (result.status === 201) {
        toast.success(isRange ? "Quote request sent!" : "Booking created successfully!");
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
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      {/* Service Info */}
      <div className="space-y-2">
        <Label className="text-sm md:text-base font-semibold">Service</Label>
        <p className="text-xs md:text-sm text-muted-foreground">{serviceTitle}</p>
      </div>

      {/* Package selector */}
      {isPackages && servicePackages.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm md:text-base font-semibold">Select a Package *</Label>
          <div className="space-y-2">
            {servicePackages.map((pkg) => (
              <button
                key={pkg.name}
                type="button"
                onClick={() => setSelectedPackage(pkg)}
                className={`w-full text-left p-3 rounded-md border transition-colors ${
                  selectedPackage?.name === pkg.name
                    ? 'border-primary bg-primary/5'
                    : 'border-input bg-background hover:bg-accent'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{pkg.name}</span>
                  <span className="font-bold text-sm text-primary">GH₵{Number(pkg.price).toFixed(2)}</span>
                </div>
                {pkg.description && (
                  <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Display — fixed/range only */}
      {!isPackages && (
        <Card className="p-3 md:p-4 bg-muted/50">
          <div className="space-y-2">
            {isRange && priceMin != null && priceMax != null ? (
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-muted-foreground">Price Range</span>
                <span className="text-sm md:text-base font-semibold">GH₵{priceMin.toFixed(2)} – GH₵{priceMax.toFixed(2)}</span>
              </div>
            ) : (
              <>
                {defaultPrice && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Price</span>
                    <span className="text-sm md:text-base font-semibold">GH₵{defaultPrice.toFixed(2)}</span>
                  </div>
                )}
                {expressPrice && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-muted-foreground">Express Price</span>
                    <span className="text-sm md:text-base font-semibold">GH₵{expressPrice.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            {isRange && (
              <p className="text-xs text-muted-foreground">The seller will quote a specific price based on your requirements.</p>
            )}
          </div>
        </Card>
      )}

      {/* Buyer Requirements — required for range-priced services */}
      {isRange && (
        <div className="space-y-2">
          <Label htmlFor="buyer-requirements" className="flex items-center gap-2 text-sm md:text-base">
            <MessageSquare className="h-4 w-4" />
            Describe What You Need *
          </Label>
          <Textarea
            id="buyer-requirements"
            placeholder="Tell the seller exactly what you need — e.g. scope, timeline, any specific requirements. The more detail you provide, the more accurate the quote will be."
            value={buyerRequirements}
            onChange={(e) => setBuyerRequirements(e.target.value)}
            className="min-h-[120px] text-sm"
            required
          />
          <p className="text-xs text-muted-foreground">
            The seller will review this and send you a quote within the price range.
          </p>
        </div>
      )}

      {/* Schedule Option */}
      <div className="flex items-center space-x-2 p-3 md:p-4 bg-muted/50 rounded-md">
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
            <Label htmlFor="date" className="flex items-center gap-2 text-sm md:text-base">
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
              <p className="text-xs md:text-sm text-muted-foreground text-center">
                Selected: {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
            )}
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2 text-sm md:text-base">
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
              <p className="text-xs md:text-sm text-muted-foreground">
                Selected: {format(new Date(`2000-01-01T${selectedTime}`), "h:mm a")}
              </p>
            )}
          </div>
        </>
      )}

      {/* Preferred Time Note (Optional) */}
      {!scheduleForLater && (
        <div className="space-y-2">
          <Label htmlFor="note" className="flex items-center gap-2 text-sm md:text-base">
            <MessageSquare className="h-4 w-4" />
            Preferred Date/Time (Optional)
          </Label>
          <Textarea
            id="note"
            placeholder="E.g., 'Anytime this week' or 'Prefer mornings'..."
            value={preferredTimeNote}
            onChange={(e) => setPreferredTimeNote(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Let the seller know if you have a preferred time for this service
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-2 md:p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-xs md:text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 md:pt-4">
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
              {isRange ? 'Sending Request...' : 'Creating Booking...'}
            </>
          ) : (
            isRange ? 'Send Quote Request' : 'Confirm Booking'
          )}
        </Button>
      </div>
    </form>
  );
};

