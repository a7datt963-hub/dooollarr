import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { UserCog, Users } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AccountSelection = ({ onSetup }) => {
  const [view, setView] = useState("selection");
  const [managerCodeInput, setManagerCodeInput] = useState("");
  const [employeeNameInput, setEmployeeNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleManagerSetup = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/managers`);
      const managerCode = response.data.manager_code;
      onSetup("manager", managerCode);
      toast.success(`تم إنشاء حساب مدير بنجاح! كود المدير: ${managerCode}`);
      navigate("/sales");
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء حساب المدير");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSetup = async () => {
    if (!managerCodeInput.trim()) {
      toast.error("الرجاء إدخال كود المدير");
      return;
    }
    if (!employeeNameInput.trim()) {
      toast.error("الرجاء إدخال اسمك");
      return;
    }

    setLoading(true);
    try {
      await axios.get(`${API}/managers/${managerCodeInput}`);
      await axios.post(`${API}/employees`, {
        name: employeeNameInput,
        manager_code: managerCodeInput,
      });
      onSetup("employee", managerCodeInput, employeeNameInput, "sales_only");
      toast.success("تم تقديم طلب الانضمام! في انتظار موافقة المدير");
      navigate("/sales");
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("كود المدير غير صحيح");
      } else {
        toast.error("حدث خطأ أثناء تقديم الطلب");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100">
      <Card className="w-full max-w-md fade-in shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-blue-600" data-testid="app-title">كاشيرنا</CardTitle>
          <CardDescription className="text-lg">اختر نوع حسابك للبدء</CardDescription>
        </CardHeader>
        <CardContent>
          {view === "selection" && (
            <div className="space-y-4">
              <Button
                data-testid="manager-selection-btn"
                onClick={() => setView("manager")}
                className="w-full h-20 text-lg bg-blue-600 hover:bg-blue-700"
              >
                <UserCog className="ml-2 w-6 h-6" />
                مدير
              </Button>
              <Button
                data-testid="employee-selection-btn"
                onClick={() => setView("employee")}
                variant="outline"
                className="w-full h-20 text-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Users className="ml-2 w-6 h-6" />
                موظف
              </Button>
            </div>
          )}

          {view === "manager" && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  سيتم إنشاء لوحة تحكم خاصة بك وكود مدير مكون من 7 خانات.
                </p>
              </div>
              <Button
                data-testid="create-manager-btn"
                onClick={handleManagerSetup}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "جاري الإنشاء..." : "إنشاء حساب مدير"}
              </Button>
              <Button
                onClick={() => setView("selection")}
                variant="ghost"
                className="w-full"
              >
                رجوع
              </Button>
            </div>
          )}

          {view === "employee" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="manager-code">كود المدير</Label>
                <Input
                  id="manager-code"
                  data-testid="employee-manager-code-input"
                  placeholder="أدخل كود المدير (7 خانات)"
                  value={managerCodeInput}
                  onChange={(e) => setManagerCodeInput(e.target.value.toUpperCase())}
                  maxLength={7}
                  className="text-center tracking-wider"
                />
              </div>
              <div>
                <Label htmlFor="employee-name">اسمك</Label>
                <Input
                  id="employee-name"
                  data-testid="employee-name-input"
                  placeholder="أدخل اسمك"
                  value={employeeNameInput}
                  onChange={(e) => setEmployeeNameInput(e.target.value)}
                />
              </div>
              <Button
                data-testid="submit-employee-btn"
                onClick={handleEmployeeSetup}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "جاري الإرسال..." : "تأكيد"}
              </Button>
              <Button
                onClick={() => setView("selection")}
                variant="ghost"
                className="w-full"
              >
                رجوع
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSelection;