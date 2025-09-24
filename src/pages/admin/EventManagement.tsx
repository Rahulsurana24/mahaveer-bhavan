import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Calendar, MapPin, Users, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";

const EventManagement = () => {
  const events = [
    {
      id: "EVT-001",
      title: "Monthly Satsang",
      type: "Religious",
      date: "2024-01-15",
      time: "6:00 PM",
      location: "Main Hall",
      capacity: 200,
      registered: 145,
      status: "published",
      fees: 0
    },
    {
      id: "EVT-002", 
      title: "Charity Drive",
      type: "Social",
      date: "2024-01-20",
      time: "10:00 AM",
      location: "Community Center",
      capacity: 100,
      registered: 89,
      status: "published",
      fees: 0
    },
    {
      id: "EVT-003",
      title: "Temple Visit",
      type: "Trip",
      date: "2024-01-25",
      time: "8:00 AM",
      location: "Various Temples",
      capacity: 80,
      registered: 67,
      status: "draft",
      fees: 500
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "published": "default",
      "draft": "secondary",
      "cancelled": "destructive",
      "completed": "outline"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "Religious": "default",
      "Social": "secondary", 
      "Trip": "outline",
      "Educational": "destructive"
    };
    return <Badge variant={variants[type] || "outline"}>{type}</Badge>;
  };

  return (
    <AdminLayout title="Event Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Event Management</h2>
            <p className="text-muted-foreground">Create and manage trust events and activities</p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events by title or location..."
                    className="pl-9"
                  />
                </div>
              </div>
              <Select>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="religious">Religious</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="trip">Trip</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Events ({events.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground">{event.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(event.type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <div>
                          <div className="text-sm">{event.date}</div>
                          <div className="text-xs text-muted-foreground">{event.time}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="text-sm">{event.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span className="text-sm">
                          {event.registered}/{event.capacity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.fees === 0 ? (
                        <Badge variant="outline">Free</Badge>
                      ) : (
                        <span>₹{event.fees}</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Event
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Users className="mr-2 h-4 w-4" />
                            Manage Registrations
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default EventManagement;