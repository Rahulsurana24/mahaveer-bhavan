import { MainLayout } from '@/components/layout/main-layout';
import { EventCalendar } from '@/components/calendar/EventCalendar';

const Calendar = () => {
  return (
    <MainLayout title="Calendar">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Community Calendar</h1>
          <p className="text-muted-foreground">
            View upcoming events, trips, upvas, and important dates
          </p>
        </div>

        <EventCalendar isAdmin={false} />
      </div>
    </MainLayout>
  );
};

export default Calendar;
