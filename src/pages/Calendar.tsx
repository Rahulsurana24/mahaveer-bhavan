import MobileLayout from '@/components/layout/MobileLayout';
import { EventCalendar } from '@/components/calendar/EventCalendar';

const Calendar = () => {
  return (
    <MobileLayout title="Calendar">
      <div className="space-y-4">
        <div className="bg-white px-4 py-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Community Calendar</h1>
          <p className="text-sm text-gray-600">
            View upcoming events, trips, upvas, and important dates
          </p>
        </div>

        <div className="px-4">
          <EventCalendar isAdmin={false} />
        </div>
      </div>
    </MobileLayout>
  );
};

export default Calendar;
