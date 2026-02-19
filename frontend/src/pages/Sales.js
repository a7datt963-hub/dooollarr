import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scan, Plus, Minus, Trash2, ShoppingBag, X } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import Invoice from "@/components/Invoice";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Sales = ({ accountType, managerCode, employeeName }) => {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cart, setCart] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentSale, setCurrentSale] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
      html5QrCodeRef.current = null;
    }
  };

  const handleScanBarcode = async () => {
    if (scanning) {
      await stopScanner();
      setScanning(false);
      return;
    }

    setScanning(true);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            await stopScanner();
            setScanning(false);
            setBarcodeInput(decodedText);
            await handleAddProduct(decodedText);
          },
          (errorMessage) => {
            // Scanning errors (ignore)
          }
        );
      } else {
        toast.error("لم يتم العثور على كاميرا");
        setScanning(false);
      }
    } catch (error) {
      toast.error("فشل الوصول إلى الكاميرا");
      setScanning(false);
    }
  };

  const handleAddProduct = async (barcode = barcodeInput) => {
    if (!barcode.trim()) {
      toast.error("الرجاء إدخال رمز الباركود");
      return;
    }

    try {
      const response = await axios.get(`${API}/products/barcode/${barcode}`, {
        params: { manager_code: managerCode },
      });
      const product = response.data;

      if (product.quantity <= 0) {
        toast.error("المنتج غير متوفر في المخزون");
        return;
      }

      const existingItem = cart.find((item) => item.product_id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.quantity) {
          toast.error("الكمية المتاحة غير كافية");
          return;
        }
        updateCartItemQuantity(product.id, existingItem.quantity + 1);
      } else {
        setCart([
          ...cart,
          {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            sell_price: product.sell_price,
            purchase_price: product.purchase_price,
            total: product.sell_price,
          },
        ]);
      }
      setBarcodeInput("");
      toast.success(`تم إضافة ${product.name} إلى السلة`);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("المنتج غير متوفر");
      } else {
        toast.error("حدث خطأ أثناء إضافة المنتج");
      }
    }
  };

  const updateCartItemQuantity = (productId, newQuantity) => {
    setCart(
      cart.map((item) => {
        if (item.product_id === productId) {
          return {
            ...item,
            quantity: newQuantity,
            total: item.sell_price * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const removeCartItem = (productId) => {
    setCart(cart.filter((item) => item.product_id !== productId));
    toast.success("تم حذف المنتج من السلة");
  };

  const calculateSummary = () => {
    const totalItems = cart.length;
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);
    const profit = cart.reduce((sum, item) => sum + (item.sell_price - item.purchase_price) * item.quantity, 0);
    return { totalItems, totalQuantity, totalAmount, profit };
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error("السلة فارغة");
      return;
    }

    const summary = calculateSummary();
    try {
      const response = await axios.post(`${API}/sales`, {
        items: cart,
        total_items: summary.totalItems,
        total_quantity: summary.totalQuantity,
        total_amount: summary.totalAmount,
        profit: summary.profit,
        manager_code: managerCode,
        employee_name: employeeName,
      });
      setCurrentSale(response.data);
      setShowInvoice(true);
      setCart([]);
      toast.success("تم إتمام البيع بنجاح!");
    } catch (error) {
      toast.error("حدث خطأ أثناء إتمام البيع");
    }
  };

  const summary = calculateSummary();

  return (
    <div className="container mx-auto p-4 pb-24 md:pt-20">
      {showInvoice && currentSale && (
        <Invoice sale={currentSale} onClose={() => setShowInvoice(false)} />
      )}

      <Card className="mb-4 fade-in">
        <CardHeader>
          <CardTitle className="text-2xl" data-testid="sales-page-title">المبيعات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                data-testid="barcode-input"
                placeholder="أدخل رمز الباركود"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddProduct()}
                disabled={scanning}
              />
              <Button data-testid="scan-barcode-btn" onClick={handleScanBarcode} variant={scanning ? "destructive" : "default"}>
                {scanning ? <X className="w-5 h-5" /> : <Scan className="w-5 h-5" />}
              </Button>
              <Button data-testid="add-product-btn" onClick={() => handleAddProduct()} disabled={scanning} className="bg-blue-600 hover:bg-blue-700">
                إضافة
              </Button>
            </div>

            {scanning && (
              <div className="border-2 border-blue-500 rounded-lg p-4 bg-gray-50">
                <div id="qr-reader" className="w-full"></div>
                <p className="text-center text-sm text-gray-600 mt-2">وجه الكاميرا نحو الباركود</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {cart.length > 0 && (
        <Card className="mb-4 fade-in">
          <CardHeader>
            <CardTitle>سلة المشتريات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell data-testid={`cart-item-${item.product_name}`}>{item.product_name}</TableCell>
                      <TableCell>{item.sell_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            data-testid={`decrease-quantity-${item.product_name}`}
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateCartItemQuantity(item.product_id, item.quantity - 1);
                              }
                            }}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            data-testid={`increase-quantity-${item.product_name}`}
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartItemQuantity(item.product_id, item.quantity + 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{item.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          data-testid={`remove-item-${item.product_name}`}
                          size="sm"
                          variant="destructive"
                          onClick={() => removeCartItem(item.product_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 space-y-2 border-t pt-4">
              <div className="flex justify-between text-lg">
                <span>إجمالي العناصر:</span>
                <span className="font-semibold">{summary.totalItems}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>إجمالي الكميات:</span>
                <span className="font-semibold">{summary.totalQuantity}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-blue-600">
                <span>المجموع:</span>
                <span data-testid="cart-total">{summary.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <Button
              data-testid="complete-sale-btn"
              onClick={handleCompleteSale}
              className="w-full mt-4 h-12 text-lg bg-green-600 hover:bg-green-700"
            >
              <ShoppingBag className="ml-2 w-5 h-5" />
              إتمام البيع
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Sales;