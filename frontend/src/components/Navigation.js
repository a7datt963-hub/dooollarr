import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Package, BarChart3, User } from "lucide-react";

const Navigation = ({ accountType, managerCode }) => {
  const location = useLocation();

  const navItems = [
    { path: "/sales", icon: ShoppingCart, label: "المبيعات" },
    { path: "/inventory", icon: Package, label: "المخزون" },
    ...(accountType === "manager" ? [{ path: "/dashboard", icon: BarChart3, label: "لوحة التحكم" }] : []),
    { path: "/summary", icon: User, label: "الملخص" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:top-0 md:bottom-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-around md:justify-center md:space-x-8 md:space-x-reverse">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label}`}
                className={`flex flex-col md:flex-row items-center py-3 px-4 transition-colors ${
                  isActive
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                <Icon className="w-6 h-6 mb-1 md:mb-0 md:ml-2" />
                <span className="text-xs md:text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;