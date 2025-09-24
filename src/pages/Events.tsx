import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users,
  Search,
  Filter,
  Heart,
  Share2,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";

const Events = () => {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  const events = [
    {
      id: "event-1",
      title: "Monthly Satsang",
      description: "Join us for our monthly spiritual gathering with discourse, meditation, and community fellowship.",
      type: "Religious",
      date: "2024-01-15",
      time: "6:00 PM - 8:00 PM",
      location: "Main Hall, Trust Building",
      capacity: 200,
      registered: 145,
      fees: 0,
      status: "upcoming",
      image: "/placeholder.svg",
      organizer: {
        name: "Trust Committee",
        avatar: "/placeholder.svg"
      },
      tags: ["spiritual", "community", "monthly"],
      requirements: "Please arrive 15 minutes early. Modest dress code required.",
      isRegistered: true
    },
    {
      id: "event-2",
      title: "Charity Food Drive",
      description: "Help us distribute food to underprivileged families in our community. Volunteers needed for preparation and distribution.",
      type: "Social",
      date: "2024-01-20",
      time: "9:00 AM - 2:00 PM",
      location: "Community Center",
      capacity: 100,
      registered: 89,
      fees: 0,
      status: "upcoming",
      image: "/placeholder.svg",
      organizer: {
        name: "Seva Committee",
        avatar: "/placeholder.svg"
      },
      tags: ["charity", "community service", "volunteering"],
      requirements: "Volunteers should be available for the full duration.",
      isRegistered: false
    },
    {
      id: "event-3",
      title: "Palitana Temple Visit",
      description: "Spiritual pilgrimage to the sacred Jain temples of Palitana. Transportation and meals included.",
      type: "Trip",
      date: "2024-01-25",
      time: "6:00 AM - 8:00 PM",
      location: "Palitana, Gujarat",
      capacity: 80,
      registered: 67,
      fees: 1500,
      status: "upcoming",
      image: "/placeholder.svg",
      organizer: {
        name: "Pilgrimage Committee",
        avatar: "/placeholder.svg"
      },
      tags: ["pilgrimage", "spiritual", "travel"],
      requirements: "Valid ID required. Comfortable walking shoes recommended.",
      isRegistered: true
    },
    {
      id: "event-4",
      title: "Cultural Program",
      description: "Traditional music and dance performances celebrating our rich cultural heritage.",
      type: "Cultural",
      date: "2024-01-12",
      time: "7:00 PM - 9:00 PM",
      location: "Main Auditorium",
      capacity: 300,
      registered: 234,
      fees: 0,
      status: "past",
      image: "/placeholder.svg",
      organizer: {
        name: "Cultural Committee",
        avatar: "/placeholder.svg"
      },
      tags: ["culture", "music", "dance"],
      requirements: "Free entry. Refreshments will be served.",
      isRegistered: true
    }
  ];

  const getEventsByTab = (tab: string) => {
    switch (tab) {
      case "upcoming":
        return events.filter(e => e.status === "upcoming");
      case "registered":
        return events.filter(e => e.isRegistered);
      case "past":
        return events.filter(e => e.status === "past");
      default:
        return events;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "upcoming": "default",
      "past": "secondary",
      "cancelled": "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "Religious": "default",
      "Social": "secondary",
      "Trip": "outline",
      "Cultural": "destructive"
    };
    return <Badge variant={variants[type] || "outline"}>{type}</Badge>;
  };

  const getAvailabilityStatus = (registered: number, capacity: number) => {
    const percentage = (registered / capacity) * 100;
    if (percentage >= 90) return { status: "few-spots", color: "text-red-500", icon: AlertCircle };
    if (percentage >= 70) return { status: "filling-fast", color: "text-yellow-500", icon: Info };
    return { status: "available", color: "text-green-500", icon: CheckCircle };
  };

  return (
    <MainLayout title="Events">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Trust Events</h1>
          <p className="text-muted-foreground">
            Join our community events, spiritual gatherings, and social activities
          </p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events by title or location..."
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="religious">Religious</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="trip">Trip</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="next-month">Next Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
            <TabsTrigger value="registered">My Registrations</TabsTrigger>
            <TabsTrigger value="past">Past Events</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getEventsByTab(activeTab).map((event) => {
                const availability = getAvailabilityStatus(event.registered, event.capacity);
                const AvailabilityIcon = availability.icon;
                
                return (
                  <Card 
                    key={event.id} 
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="aspect-video relative">
                      <img 
                        src={event.image} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        {getTypeBadge(event.type)}
                      </div>
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(event.status)}
                      </div>
                      {event.isRegistered && (
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Registered
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold mb-1 line-clamp-1">{event.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {event.registered}/{event.capacity}
                          </span>
                          <AvailabilityIcon className={`h-4 w-4 ${availability.color}`} />
                        </div>
                        {event.fees > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">₹{event.fees}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {event.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {event.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{event.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {getEventsByTab(activeTab).length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No events found</h3>
                  <p className="text-muted-foreground">
                    {activeTab === "upcoming" && "No upcoming events at the moment."}
                    {activeTab === "registered" && "You haven't registered for any events yet."}
                    {activeTab === "past" && "No past events to display."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Event Details Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedEvent?.title}
                {selectedEvent?.isRegistered && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Registered
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                {getTypeBadge(selectedEvent?.type)}
                {getStatusBadge(selectedEvent?.status)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="space-y-6">
                <img 
                  src={selectedEvent.image} 
                  alt={selectedEvent.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
                
                <div className="space-y-4">
                  <p className="text-muted-foreground">{selectedEvent.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Date</p>
                          <p className="text-sm text-muted-foreground">{selectedEvent.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Time</p>
                          <p className="text-sm text-muted-foreground">{selectedEvent.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Location</p>
                          <p className="text-sm text-muted-foreground">{selectedEvent.location}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Capacity</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedEvent.registered}/{selectedEvent.capacity} registered
                          </p>
                        </div>
                      </div>
                      {selectedEvent.fees > 0 && (
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Fees</p>
                            <p className="text-sm text-muted-foreground">₹{selectedEvent.fees}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={selectedEvent.organizer.avatar} />
                          <AvatarFallback>
                            {selectedEvent.organizer.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">Organizer</p>
                          <p className="text-sm text-muted-foreground">{selectedEvent.organizer.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedEvent.requirements && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Requirements & Instructions</h4>
                      <p className="text-sm text-muted-foreground">{selectedEvent.requirements}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  {selectedEvent.status === "upcoming" && (
                    <>
                      {selectedEvent.isRegistered ? (
                        <Button variant="destructive" className="flex-1">
                          Cancel Registration
                        </Button>
                      ) : (
                        <Button className="flex-1">
                          Register Now
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="outline">
                    <Heart className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Events;