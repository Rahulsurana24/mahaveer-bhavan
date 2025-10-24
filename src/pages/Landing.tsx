import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, Calendar, Image, MessageSquare, Award, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const features = [
    {
      icon: Users,
      title: t('landing.memberManagement'),
      description: t('landing.memberManagementDesc')
    },
    {
      icon: Calendar,
      title: t('landing.eventsTrips'),
      description: t('landing.eventsTripsDesc')
    },
    {
      icon: Image,
      title: t('landing.galleryMedia'),
      description: t('landing.galleryMediaDesc')
    },
    {
      icon: MessageSquare,
      title: t('landing.communication'),
      description: t('landing.communicationDesc')
    },
    {
      icon: Award,
      title: t('landing.attendance'),
      description: t('landing.attendanceDesc')
    },
    {
      icon: Shield,
      title: t('landing.secure'),
      description: t('landing.secureDesc')
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header with glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="container flex h-20 items-center justify-between px-6 mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-2xl font-semibold tracking-tight">Mahaveer Bhavan</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/auth')}
              className="text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              {t('landing.login')}
            </Button>
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:shadow-orange-500/50"
            >
              {t('landing.getStarted')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with gradient */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Gradient orbs background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container px-6 mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="space-y-6 max-w-4xl">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
                {t('landing.title').split('Mahaveer Bhavan')[0]}
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                  Mahaveer Bhavan
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-white/70 leading-relaxed">
                {t('landing.subtitle')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')} 
                className="text-lg px-10 py-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-2xl shadow-2xl shadow-orange-500/40 transition-all hover:scale-105"
              >
                {t('landing.memberLogin')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/admin/auth')} 
                className="text-lg px-10 py-6 border-2 border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-2xl backdrop-blur transition-all hover:scale-105"
              >
                {t('landing.adminAccess')}
              </Button>
            </div>

            {/* Stats with glassmorphism */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full max-w-4xl">
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all">
                <CardContent className="pt-8 pb-8 text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">500+</div>
                  <div className="text-sm text-white/60 mt-2 font-medium">{t('landing.activeMembers')}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all">
                <CardContent className="pt-8 pb-8 text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">50+</div>
                  <div className="text-sm text-white/60 mt-2 font-medium">{t('landing.eventsOrganized')}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all">
                <CardContent className="pt-8 pb-8 text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">100%</div>
                  <div className="text-sm text-white/60 mt-2 font-medium">{t('landing.digitalExperience')}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-black to-zinc-950">
        <div className="container px-6 mx-auto max-w-7xl">
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                {t('landing.everythingYouNeed')}
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                {t('landing.featuresSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="bg-white/5 border-white/10 backdrop-blur-xl hover:bg-white/10 hover:border-orange-500/50 transition-all duration-300 group"
                >
                  <CardContent className="pt-8 pb-8">
                    <div className="space-y-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-all group-hover:scale-110">
                        <feature.icon className="h-7 w-7 text-white" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                        <p className="text-white/60 leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-zinc-950">
        <div className="container px-6 mx-auto max-w-7xl">
          <Card className="bg-gradient-to-r from-orange-500 to-red-600 border-0 shadow-2xl shadow-orange-500/30 overflow-hidden">
            <CardContent className="p-12 md:p-16 relative">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="space-y-3 text-center md:text-left">
                  <h2 className="text-3xl md:text-4xl font-bold text-white">
                    {t('landing.readyToJoin')}
                  </h2>
                  <p className="text-white/90 text-lg leading-relaxed">
                    {t('landing.readyToJoinDesc')}
                  </p>
                </div>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate('/auth')}
                  className="text-lg px-10 py-6 bg-white text-red-600 hover:bg-white/90 rounded-2xl shadow-xl whitespace-nowrap font-semibold hover:scale-105 transition-all"
                >
                  {t('landing.getStartedToday')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black">
        <div className="container px-6 py-12 mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="font-semibold text-lg">Mahaveer Bhavan</span>
            </div>
            <p className="text-sm text-white/50">
              © 2025 Mahaveer Bhavan. {t('landing.allRightsReserved')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
