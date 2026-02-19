import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Package, TrendingUp, Calendar } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ managerCode }) => {
  const [statistics, setStatistics] = useState(null);
  const [filterType, setFilterType] = useState("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState("ل.س");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatistics();
    fetchSettings();
  }, [managerCode, filterType]);

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

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const params = {
        manager_code: managerCode,
        filter_type: filterType,
      };

      if (filterType === "custom" && startDate && endDate) {
        params.start_date = new Date(startDate).toISOString();
        params.end_date = new Date(endDate).toISOString();
      }

      const response = await axios.get(`${API}/statistics`, { params });
      setStatistics(response.data);
    } catch (error) {
      toast.error("حدث خطأ أثناء تحميل الإحصائيات");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateFilter = () => {
    if (!startDate || !endDate) {
      toast.error("الرجاء اختيار تاريخ البداية والنهاية");
      return;
    }
    setFilterType("custom");
    fetchStatistics();
  };

  return (
    <div className="container mx-auto p-4 pb-24 md:pt-20">
      <Card className="mb-4 fade-in">
        <CardHeader>
          <CardTitle className="text-2xl" data-testid="dashboard-title">لوحة التحكم</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label>فلتر الإحصائيات</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger data-testid="filter-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">يومي</SelectItem>
                    <SelectItem value="weekly">أسبوعي</SelectItem>
                    <SelectItem value="monthly">شهري</SelectItem>
                    <SelectItem value="custom">تاريخ مخصص</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filterType === "custom" && (
                <>
                  <div className="flex-1">
                    <Label htmlFor="start-date">من تاريخ</Label>
                    <Input
                      id="start-date"
                      data-testid="start-date-input"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="end-date">إلى تاريخ</Label>
                    <Input
                      id="end-date"
                      data-testid="end-date-input"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button data-testid="apply-custom-filter-btn" onClick={handleCustomDateFilter} className="bg-blue-600 hover:bg-blue-700">
                      تطبيق
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
        </div>
      ) : statistics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="card-hover bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">إجمالي المبيعات</p>
                    <p className="text-3xl font-bold text-blue-600" data-testid="total-sales">
                      {statistics.total_sales.toFixed(2)} {currency}
                    </p>
                  </div>
                  <DollarSign className="w-12 h-12 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">عدد المنتجات المباعة</p>
                    <p className="text-3xl font-bold text-green-600" data-testid="total-products">
                      {statistics.total_products}
                    </p>
                  </div>
                  <Package className="w-12 h-12 text-green-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">الربح الصافي</p>
                    <p className="text-3xl font-bold text-purple-600" data-testid="total-profit">
                      {statistics.total_profit.toFixed(2)} {currency}
                    </p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-purple-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="fade-in">
            <CardHeader>
              <CardTitle>المنتجات المباعة</CardTitle>
            </CardHeader>
            <CardContent>
              {statistics.products_sold.length > 0 ? (
                <div className="space-y-3">
                  {statistics.products_sold.map((product, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium" data-testid={`sold-product-${product.name}`}>{product.name}</span>
                      <span className="text-blue-600 font-bold">{product.quantity} قطعة</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>لا توجد مبيعات في هذه الفترة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;