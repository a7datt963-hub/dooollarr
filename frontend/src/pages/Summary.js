import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Copy, RefreshCw, Crown, Settings as SettingsIcon, Trash2, Users, UserCheck, X, Download, Shield } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Summary = ({ accountType, managerCode, onAccountChange, employeePermissions }) => {
  const navigate = useNavigate();
  const [manager, setManager] = useState(null);
  const [showProDialog, setShowProDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showEmployeesDialog, setShowEmployeesDialog] = useState(false);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [currency, setCurrency] = useState("ل.س");
  const [employees, setEmployees] = useState([]);
  const [pendingEmployees, setPendingEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedPermission, setSelectedPermission] = useState("sales_only");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accountType === "manager" && managerCode) {
      fetchManager();
      fetchEmployees();
    }
    fetchSettings();
  }, [accountType, managerCode]);

  const fetchManager = async () => {
    try {
      const response = await axios.get(`${API}/managers/${managerCode}`);
      setManager(response.data);
    } catch (error) {
      console.error("Error fetching manager:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API}/employees`, {
        params: { manager_code: managerCode, status: "approved" },
      });
      setEmployees(response.data);

      const pendingResponse = await axios.get(`${API}/employees`, {
        params: { manager_code: managerCode, status: "pending" },
      });
      setPendingEmployees(pendingResponse.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`, {
        params: { manager_code: managerCode },
      });
      setCurrency(response.data.currency);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const copyManagerCode = () => {
    navigator.clipboard.writeText(managerCode);
    toast.success("تم نسخ كود المدير");
  };

  const handleRegenerateCode = async () => {
    if (window.confirm("هل أنت متأكد؟ سيتم تسجيل خروج جميع الموظفين")) {
      try {
        const response = await axios.put(`${API}/managers/${managerCode}/regenerate`);
        const newCode = response.data.new_code;
        onAccountChange("manager", newCode);
        toast.success(`تم تغيير الكود بنجاح! الكود الجديد: ${newCode}`);
        fetchManager();
        fetchEmployees();
      } catch (error) {
        toast.error("حدث خطأ أثناء تغيير الكود");
      }
    }
  };

  const handleActivatePro = async () => {
    if (!activationCode.trim()) {
      toast.error("الرجاء إدخال كود التفعيل");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/managers/activate`, {
        code: activationCode,
        manager_code: managerCode,
      });
      toast.success("تم تفعيل Pro بنجاح!");
      setShowProDialog(false);
      setActivationCode("");
      fetchManager();
    } catch (error) {
      if (error.response?.data?.detail === "invalid_code") {
        toast.error("كود التفعيل غير صحيح");
      } else if (error.response?.data?.detail === "code_already_used") {
        toast.error("هذا الكود مستخدم بالفعل");
      } else {
        toast.error("حدث خطأ أثناء التفعيل");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = async (newCurrency) => {
    try {
      await axios.put(`${API}/settings`, null, {
        params: { currency: newCurrency, manager_code: managerCode },
      });
      setCurrency(newCurrency);
      toast.success("تم تغيير العملة بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء تغيير العملة");
    }
  };

  const handleResetProfits = async () => {
    if (window.confirm("هل أنت متأكد من تصفير الأرباح؟")) {
      try {
        await axios.post(`${API}/settings/reset-profits`, null, {
          params: { manager_code: managerCode },
        });
        toast.success("تم تصفير الأرباح بنجاح");
      } catch (error) {
        toast.error("حدث خطأ أثناء تصفير الأرباح");
      }
    }
  };

  const handleDeleteSales = async () => {
    if (window.confirm("هل أنت متأكد من حذف سجل المبيعات؟")) {
      try {
        await axios.delete(`${API}/sales`, {
          params: { manager_code: managerCode },
        });
        toast.success("تم حذف سجل المبيعات بنجاح");
      } catch (error) {
        toast.error("حدث خطأ أثناء حذف سجل المبيعات");
      }
    }
  };

  const handleResetAll = async () => {
    if (window.confirm("تحذير: سيتم حذف جميع البيانات! هل أنت متأكد؟")) {
      try {
        await axios.delete(`${API}/settings/reset-all`, {
          params: { manager_code: managerCode },
        });
        toast.success("تم حذف جميع البيانات بنجاح");
        navigate("/sales");
      } catch (error) {
        toast.error("حدث خطأ أثناء حذف البيانات");
      }
    }
  };

  const handleApproveEmployee = async (employeeId) => {
    try {
      await axios.put(`${API}/employees/${employeeId}/status`, null, {
        params: { status: "approved" },
      });
      toast.success("تمت الموافقة على الموظف");
      fetchEmployees();
    } catch (error) {
      toast.error("حدث خطأ");
    }
  };

  const handleRejectEmployee = async (employeeId) => {
    try {
      await axios.delete(`${API}/employees/${employeeId}`);
      toast.success("تم رفض الموظف");
      fetchEmployees();
    } catch (error) {
      toast.error("حدث خطأ");
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (window.confirm("هل أنت متأكد من طرد هذا الموظف؟")) {
      try {
        await axios.delete(`${API}/employees/${employeeId}`);
        toast.success("تم طرد الموظف");
        fetchEmployees();
      } catch (error) {
        toast.error("حدث خطأ");
      }
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedEmployee) return;

    try {
      await axios.put(`${API}/employees/permissions`, {
        employee_id: selectedEmployee.id,
        permissions: selectedPermission,
      });
      toast.success("تم تحديث صلاحيات الموظف");
      setShowPermissionsDialog(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast.error("حدث خطأ");
    }
  };

  const handleExport = async (dataType, format) => {
    try {
      const response = await axios.get(`${API}/export`, {
        params: { manager_code: managerCode, data_type: dataType },
      });

      let content = "";
      const data = response.data;

      if (format === "json") {
        content = JSON.stringify(data, null, 2);
      } else if (format === "csv") {
        if (dataType === "products" || dataType === "all") {
          content += "Products\n";
          content += "Name,Barcode,Purchase Price,Sell Price,Quantity\n";
          (data.products || []).forEach((p) => {
            content += `${p.name},${p.barcode},${p.purchase_price},${p.sell_price},${p.quantity}\n`;
          });
        }
        if (dataType === "sales" || dataType === "all") {
          content += "\nSales\n";
          content += "ID,Total Amount,Profit,Date\n";
          (data.sales || []).forEach((s) => {
            content += `${s.id},${s.total_amount},${s.profit},${s.created_at}\n`;
          });
        }
      } else if (format === "txt") {
        content = JSON.stringify(data, null, 2);
      }

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kashirna-export-${Date.now()}.${format}`;
      a.click();
      toast.success("تم تصدير البيانات بنجاح");
      setShowExportDialog(false);
    } catch (error) {
      toast.error("حدث خطأ أثناء تصدير البيانات");
    }
  };

  const getAccountTypeLabel = () => {
    if (accountType === "guest") return "ضيف";
    if (accountType === "manager") return "مدير";
    return "موظف";
  };

  const getAvatarInitial = () => {
    if (accountType === "guest") return "-";
    if (managerCode) return managerCode.charAt(0);
    return "?";
  };

  const canAccessProFeatures = accountType === "manager" && manager?.is_pro;
  const canManageEmployees = accountType === "manager" || employeePermissions === "deputy_manager";
  const canExport = accountType === "manager" && manager?.is_pro;

  return (
    <div className="container mx-auto p-4 pb-24 md:pt-20">
      <Card className="fade-in">
        <CardHeader>
          <CardTitle className="text-2xl" data-testid="summary-page-title">الملخص</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-6">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarFallback className="text-3xl bg-blue-100 text-blue-600">
                {getAvatarInitial()}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-bold mb-2" data-testid="manager-code-display">
              {managerCode || "-----"}
            </h3>
            <p className="text-gray-600" data-testid="account-type">{getAccountTypeLabel()}</p>
            {manager?.is_pro && (
              <div className="flex items-center gap-2 mt-2 bg-yellow-100 px-4 py-2 rounded-full">
                <Crown className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800 font-semibold">Pro</span>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          <div className="space-y-3">
            {accountType === "guest" && (
              <Button
                data-testid="select-account-type-btn"
                onClick={() => navigate("/account-selection")}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <User className="ml-2 w-5 h-5" />
                اختيار نوع الحساب
              </Button>
            )}

            {accountType === "manager" && (
              <>
                <div className="flex gap-2">
                  <Button data-testid="copy-manager-code-btn" onClick={copyManagerCode} variant="outline" className="flex-1">
                    <Copy className="ml-2 w-5 h-5" />
                    نسخ الكود
                  </Button>
                  <Button onClick={handleRegenerateCode} variant="outline" className="flex-1">
                    <RefreshCw className="ml-2 w-5 h-5" />
                    تغيير الكود
                  </Button>
                </div>

                {!manager?.is_pro && (
                  <Button
                    data-testid="activate-pro-btn"
                    onClick={() => setShowProDialog(true)}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                  >
                    <Crown className="ml-2 w-5 h-5" />
                    تفعيل اشتراك Pro
                  </Button>
                )}

                <Button
                  data-testid="view-employees-btn"
                  onClick={() => setShowEmployeesDialog(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Users className="ml-2 w-5 h-5" />
                  مشاهدة الموظفين ({employees.length})
                </Button>

                {pendingEmployees.length > 0 && (
                  <Button
                    data-testid="pending-requests-btn"
                    onClick={() => setShowPendingDialog(true)}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <UserCheck className="ml-2 w-5 h-5" />
                    طلبات الدخول ({pendingEmployees.length})
                  </Button>
                )}

                {canAccessProFeatures && (
                  <Button
                    data-testid="employee-permissions-btn"
                    onClick={() => setShowPermissionsDialog(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Shield className="ml-2 w-5 h-5" />
                    صلاحيات الموظفين
                  </Button>
                )}
              </>
            )}

            <Button
              data-testid="settings-btn"
              onClick={() => setShowSettingsDialog(true)}
              variant="outline"
              className="w-full"
            >
              <SettingsIcon className="ml-2 w-5 h-5" />
              الإعدادات
            </Button>

            {canExport && (
              <Button
                data-testid="export-data-btn"
                onClick={() => setShowExportDialog(true)}
                variant="outline"
                className="w-full"
              >
                <Download className="ml-2 w-5 h-5" />
                تصدير البيانات
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pro Activation Dialog */}
      <Dialog open={showProDialog} onOpenChange={setShowProDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-600" />
              تفعيل اشتراك Pro
            </DialogTitle>
            <DialogDescription>
              ميزات Pro:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>منتجات غير محدودة</li>
                <li>تصدير البيانات بجميع الأنواع</li>
                <li>صلاحيات تحكم كاملة للموظفين</li>
                <li>تقارير متقدمة</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="activation-code">كود التفعيل (12 خانة)</Label>
              <Input
                id="activation-code"
                data-testid="activation-code-input"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                placeholder="أدخل كود التفعيل"
                maxLength={12}
                className="text-center tracking-wider"
              />
            </div>
            <Button
              onClick={() => window.open("https://wa.me/+963982559890", "_blank")}
              variant="outline"
              className="w-full"
            >
              طلب كود عبر واتساب
            </Button>
          </div>
          <DialogFooter>
            <Button data-testid="submit-activation-code-btn" onClick={handleActivatePro} disabled={loading} className="bg-yellow-600 hover:bg-yellow-700">
              {loading ? "جاري التفعيل..." : "تفعيل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الإعدادات</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>العملة</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger data-testid="currency-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ل.س">ليرة سورية (ل.س)</SelectItem>
                  <SelectItem value="$">دولار ($)</SelectItem>
                  <SelectItem value="€">يورو (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <Button onClick={handleResetProfits} variant="outline" className="w-full">
              <Trash2 className="ml-2 w-5 h-5" />
              تصفير الأرباح
            </Button>
            {accountType === "manager" && (
              <>
                <Button data-testid="delete-sales-btn" onClick={handleDeleteSales} variant="outline" className="w-full text-red-600">
                  <Trash2 className="ml-2 w-5 h-5" />
                  حذف سجل المبيعات
                </Button>
                <Button onClick={handleResetAll} variant="destructive" className="w-full">
                  <Trash2 className="ml-2 w-5 h-5" />
                  حذف كافة السجلات
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Employees Dialog */}
      <Dialog open={showEmployeesDialog} onOpenChange={setShowEmployeesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الموظفين</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span data-testid={`employee-${emp.name}`}>{emp.name}</span>
                <Button
                  data-testid={`delete-employee-${emp.name}`}
                  onClick={() => handleDeleteEmployee(emp.id)}
                  variant="destructive"
                  size="sm"
                >
                  طرد
                </Button>
              </div>
            ))}
            {employees.length === 0 && (
              <p className="text-center text-gray-500 py-8">لا يوجد موظفين</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Employees Dialog */}
      <Dialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طلبات الدخول</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pendingEmployees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span>{emp.name}</span>
                <div className="flex gap-2">
                  <Button
                    data-testid={`approve-employee-${emp.name}`}
                    onClick={() => handleApproveEmployee(emp.id)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    قبول
                  </Button>
                  <Button
                    onClick={() => handleRejectEmployee(emp.id)}
                    variant="destructive"
                    size="sm"
                  >
                    رفض
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>صلاحيات الموظفين</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اختر موظف</Label>
              <Select
                value={selectedEmployee?.id || ""}
                onValueChange={(val) => {
                  const emp = employees.find((e) => e.id === val);
                  setSelectedEmployee(emp);
                  setSelectedPermission(emp?.permissions || "sales_only");
                }}
              >
                <SelectTrigger data-testid="select-employee-permissions">
                  <SelectValue placeholder="اختر موظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEmployee && (
              <div>
                <Label>الصلاحية</Label>
                <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                  <SelectTrigger data-testid="select-permission-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales_only">موظف عادي - البيع فقط</SelectItem>
                    <SelectItem value="inventory_management">موظف ثاني - البيع والمخزون</SelectItem>
                    <SelectItem value="deputy_manager">نائب مدير - كافة الميزات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleUpdatePermissions} disabled={!selectedEmployee} className="bg-blue-600 hover:bg-blue-700">
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تصدير البيانات</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">نوع البيانات:</h4>
              <Button onClick={() => handleExport("products", "csv")} variant="outline" className="w-full">
                منتجات - CSV
              </Button>
              <Button onClick={() => handleExport("sales", "csv")} variant="outline" className="w-full">
                مبيعات - CSV
              </Button>
              <Button onClick={() => handleExport("all", "csv")} variant="outline" className="w-full">
                جميع البيانات - CSV
              </Button>
              <Button onClick={() => handleExport("all", "json")} variant="outline" className="w-full">
                جميع البيانات - JSON
              </Button>
              <Button onClick={() => handleExport("all", "txt")} variant="outline" className="w-full">
                جميع البيانات - TXT
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Summary;