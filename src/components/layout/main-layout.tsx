import { Header } from "./header";
import { BottomNavigation } from "./bottom-navigation";
import { Footer } from "./footer";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBottomNav?: boolean;
  showFooter?: boolean;
}

const MainLayout = ({
  children,
  title,
  showBottomNav = true,
  showFooter = false
}: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header title={title} />
      <main className={cn(
        "flex-1 overflow-auto",
        "pt-16", // Header height
        showBottomNav && "pb-24" // Bottom nav height
      )}>
        {children}
      </main>
      {showFooter && <Footer />}
      {showBottomNav && <BottomNavigation />}
    </div>
  );
};

export { MainLayout };
