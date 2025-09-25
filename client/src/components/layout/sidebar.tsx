import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "fas fa-tachometer-alt", path: "/" },
  { id: "documents", label: "Documents", icon: "fas fa-folder-open", path: "/documents" },
  { id: "upload", label: "Upload", icon: "fas fa-cloud-upload-alt", path: "/upload" },
  { id: "recipients", label: "Recipients", icon: "fas fa-users", path: "/recipients" },
  { id: "billing", label: "Billing", icon: "fas fa-credit-card", path: "/billing" },
];

export function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-file-signature text-primary-foreground text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">DocuSign Pro</h1>
            <p className="text-sm text-muted-foreground">Real Estate Edition</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setLocation(item.path)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive(item.path)
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
            }`}
            data-testid={`nav-${item.id}`}
          >
            <i className={`${item.icon} w-5`}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 mb-4">
          {(user as any)?.profileImageUrl ? (
            <img 
              src={(user as any).profileImageUrl} 
              alt="Profile" 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <i className="fas fa-user text-primary"></i>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-name">
              {(user as any)?.firstName && (user as any)?.lastName 
                ? `${(user as any).firstName} ${(user as any).lastName}`
                : (user as any)?.email || 'User'
              }
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Real Estate Professional
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          data-testid="button-sign-out"
        >
          <i className="fas fa-sign-out-alt mr-2"></i>
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
