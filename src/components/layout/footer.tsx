import { Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border p-4 mt-auto">
      <div className="text-center space-y-2">
        <h3 className="font-semibold text-sm text-card-foreground">
          Sree Mahaveer Swami Charitable Trust
        </h3>
        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>Contact Us</span>
          </div>
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            <span>info@mahaveerbhavan.org</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>Location</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2024 Mahaveer Bhavan. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export { Footer };