import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Dashboard from "./pages/Dashboard";
import Summary from "./pages/Summary";
import AccountSelection from "./pages/AccountSelection";
import Navigation from "./components/Navigation";
import { Toaster } from "./components/ui/sonner";

function App() {
  const [accountType, setAccountType] = useState(localStorage.getItem("accountType") || "guest");
  const [managerCode, setManagerCode] = useState(localStorage.getItem("managerCode") || null);
  const [employeeName, setEmployeeName] = useState(localStorage.getItem("employeeName") || null);
  const [employeePermissions, setEmployeePermissions] = useState(localStorage.getItem("employeePermissions") || "sales_only");

  useEffect(() => {
    if (accountType) localStorage.setItem("accountType", accountType);
    if (managerCode) localStorage.setItem("managerCode", managerCode);
    if (employeeName) localStorage.setItem("employeeName", employeeName);
    if (employeePermissions) localStorage.setItem("employeePermissions", employeePermissions);
  }, [accountType, managerCode, employeeName, employeePermissions]);

  const handleAccountSetup = (type, code, name = null, permissions = "sales_only") => {
    setAccountType(type);
    setManagerCode(code);
    setEmployeeName(name);
    setEmployeePermissions(permissions);
  };

  return (
    <div className="App" dir="rtl">
      <BrowserRouter>
        {accountType !== "guest" && <Navigation accountType={accountType} managerCode={managerCode} />}
        <Routes>
          <Route path="/" element={accountType === "guest" ? <Navigate to="/account-selection" /> : <Navigate to="/sales" />} />
          <Route path="/account-selection" element={<AccountSelection onSetup={handleAccountSetup} />} />
          <Route path="/sales" element={<Sales accountType={accountType} managerCode={managerCode} employeeName={employeeName} employeePermissions={employeePermissions} />} />
          <Route path="/inventory" element={<Inventory accountType={accountType} managerCode={managerCode} employeePermissions={employeePermissions} />} />
          <Route path="/dashboard" element={accountType === "manager" ? <Dashboard managerCode={managerCode} /> : <Navigate to="/sales" />} />
          <Route path="/summary" element={<Summary accountType={accountType} managerCode={managerCode} onAccountChange={handleAccountSetup} employeePermissions={employeePermissions} />} />
        </Routes>
        <Toaster position="top-center" dir="rtl" />
      </BrowserRouter>
    </div>
  );
}

export default App;