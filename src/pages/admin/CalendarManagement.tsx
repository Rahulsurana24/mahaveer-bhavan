import { AdminLayout } from '@/components/layout/admin-layout';
import { EventCalendar } from '@/components/calendar/EventCalendar';

const CalendarManagement = () => {
  return (
    <AdminLayout title="Calendar Management">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Event Calendar</h2>
          <p className="text-muted-foreground">
            Manage events, trips, upvas, biyashna, and holidays
          </p>
        </div>

        <EventCalendar isAdmin={true} />
      </div>
    </AdminLayout>
  );
};

export default CalendarManagement;
