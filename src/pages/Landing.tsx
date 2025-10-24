import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, Calendar, Image, MessageSquare, Award, Shield } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Member Management',
      description: 'Comprehensive member profiles and community management'
    },
    {
      icon: Calendar,
      title: 'Events & Trips',
      description: 'Organize trips, events, upvas, and community gatherings'
    },
    {
      icon: Image,
      title: 'Gallery & Media',
      description: 'Share photos and memories from community events'
    },
    {
      icon: MessageSquare,
      title: 'Communication',
      description: 'Stay connected with announcements and messaging'
    },
    {
      icon: Award,
      title: 'Attendance Tracking',
      description: 'Track kit distribution and member participation'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Your data is safe with role-based access control'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold">Mahaveer Bhavan</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Login
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container px-4 py-24 md:py-32">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Welcome to <span className="text-primary">Mahaveer Bhavan</span>
            </h1>
            <p className="text-xl text-muted-foreground md:text-2xl">
              A complete community management platform for spiritual organizations
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
              Member Login
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/admin/auth')} className="text-lg px-8">
              Admin Access
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 w-full max-w-3xl">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground mt-1">Active Members</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-primary">50+</div>
                <div className="text-sm text-muted-foreground mt-1">Events Organized</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground mt-1">Digital Experience</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 py-24 bg-background">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features to manage your spiritual community efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-24">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Ready to Join Our Community?</h2>
                <p className="text-primary-foreground/90 text-lg">
                  Connect with fellow members and stay updated with all activities
                </p>
              </div>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 whitespace-nowrap"
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold">M</span>
              </div>
              <span className="font-semibold">Mahaveer Bhavan</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Mahaveer Bhavan. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
