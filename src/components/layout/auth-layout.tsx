import { Footer } from "./footer";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AuthLayout = ({ children, title }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {title && (
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">M</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground">Sree Mahaveer Swami Charitable Trust</p>
            </div>
          )}
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export { AuthLayout };