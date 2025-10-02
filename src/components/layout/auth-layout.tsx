import { Footer } from "./footer";
import trustLogo from "@/assets/trust-logo.png";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AuthLayout = ({ children, title }: AuthLayoutProps) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Set dark mode as default
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
    setIsDark(true);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="backdrop-blur-md bg-background/50 hover:bg-background/80 border border-border/50 transition-all duration-300 hover:scale-110"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {title && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="mx-auto h-32 w-32 bg-background/80 backdrop-blur-xl rounded-full flex items-center justify-center border-2 border-primary/20 shadow-2xl shadow-primary/20 hover:scale-110 transition-transform duration-500">
                <img src={trustLogo} alt="Trust Logo" className="h-28 w-28 object-contain" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="text-muted-foreground text-sm">Sree Mahaveer Swami Charitable Trust</p>
            </div>
          )}
          <div className="backdrop-blur-xl bg-card/50 p-8 rounded-2xl border border-border/50 shadow-2xl shadow-primary/5 hover:shadow-primary/10 transition-all duration-500">
            {children}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export { AuthLayout };