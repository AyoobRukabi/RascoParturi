// Design-preview only: renders the booking confirmation with sample data so the final step can be reviewed directly.
import { BookingConfirmation } from "@/components/BookingConfirmation";
import { SAMPLE_CATALOG, localToIso } from "@/lib/preview";
import { addDays, todayInTz } from "@/lib/time";
import { useNavigate } from "react-router-dom";

export function PreviewConfirmation() {
  const nav = useNavigate();
  const svcs = SAMPLE_CATALOG.services.slice(0, 1).concat(SAMPLE_CATALOG.services.slice(5, 6));
  return (
    <div className="container-x pb-24 pt-14">
      <BookingConfirmation preview onNew={() => nav("/preview/book")}
        d={{ token: "preview", startsAt: localToIso(addDays(todayInTz("Europe/Helsinki"), 3), "14:30"), emailSent: true, email: "sample@example.test", barber: "Sample barber A", services: svcs, totalPrice: 3000, totalMinutes: 50, tz: "Europe/Helsinki" }} />
    </div>
  );
}
