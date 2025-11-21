import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ReviewFormProps {
  bookingId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ReviewForm = ({ bookingId, onSuccess, onCancel }: ReviewFormProps) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setLoading(true);

    try {
      const result = await api.reviews.create(bookingId, {
        rating,
        review_text: reviewText || undefined,
      }) as any;

      if (result.status === 201) {
        toast.success("Review submitted successfully!");
        onSuccess?.();
      } else {
        toast.error(result.msg || "Failed to submit review");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave a Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Rating <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                  disabled={loading}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} {rating === 1 ? "star" : "stars"}
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label htmlFor="review-text" className="text-sm font-medium mb-2 block">
              Your Review (Optional)
            </label>
            <Textarea
              id="review-text"
              placeholder="Share your experience with this seller..."
              value={reviewText}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setReviewText(e.target.value);
                }
              }}
              rows={4}
              disabled={loading}
              className="resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reviewText.length}/500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

