import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Scan, Package as PackageIcon, Edit, Trash2, AlertCircle, X } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Inventory = ({ accountType, managerCode, employeePermissions }) => {
  const [products, setProducts] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const html5QrCodeRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    purchase_price: "",
    sell_price: "",
    quantity: "",
  });

  useEffect(() => {
    fetchProducts();
    checkProStatus();
    return () => {
      stopScanner();
    };
  }, [managerCode]);

  const checkProStatus = async () => {
    if (managerCode) {
      try {
        const response = await axios.get(`${API}/managers/${managerCode}`);
        setIsPro(response.data.is_pro);
      } catch (error) {
        console.error("Error checking pro status:", error);
      }
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`, {
        params: { manager_code: managerCode },
      });
      setProducts(response.data);

      // Check for low stock
      response.data.forEach((product) => {
        if (product.quantity < 3 && product.quantity > 0) {
          toast.warning(`تنبيه: كمية ${product.name} قليلة (${product.quantity})`);
        }
      });
    } catch (error) {
      toast.error("حدث خطأ أثناء تحميل المنتجات");
    }
  };

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
        const html5QrCode = new Html5Qrcode("qr-reader-inventory");
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
            setFormData({ ...formData, barcode: decodedText });
            toast.success(`تم مسح الباركود: ${decodedText}`);
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

  const handleAddProduct = async () => {
    if (!formData.name || !formData.barcode || !formData.purchase_price || !formData.sell_price || !formData.quantity) {
      toast.error("الرجاء ملء جميع الحقول");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/products`, {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price),
        sell_price: parseFloat(formData.sell_price),
        quantity: parseInt(formData.quantity),
        manager_code: managerCode,
      });
      toast.success("تم إضافة المنتج بنجاح");
      setShowAddDialog(false);
      setFormData({ name: "", barcode: "", purchase_price: "", sell_price: "", quantity: "" });
      fetchProducts();
      checkProStatus();
    } catch (error) {
      if (error.response?.data?.detail === "free_limit_reached") {
        toast.error("وصلت للحد الأقصى (25 منتج). قم بتفعيل Pro للمزيد");
      } else if (error.response?.data?.detail === "barcode_exists") {
        toast.error("رمز الباركود موجود بالفعل");
      } else {
        toast.error("حدث خطأ أثناء إضافة المنتج");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async () => {
    if (!formData.name || !formData.purchase_price || !formData.sell_price || !formData.quantity) {
      toast.error("الرجاء ملء جميع الحقول");
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/products/${editingProduct.id}`, {
        name: formData.name,
        purchase_price: parseFloat(formData.purchase_price),
        sell_price: parseFloat(formData.sell_price),
        quantity: parseInt(formData.quantity),
      });
      toast.success("تم تحديث المنتج بنجاح");
      setShowEditDialog(false);
      setEditingProduct(null);
      setFormData({ name: "", barcode: "", purchase_price: "", sell_price: "", quantity: "" });
      fetchProducts();
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث المنتج");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      try {
        await axios.delete(`${API}/products/${productId}`);
        toast.success("تم حذف المنتج بنجاح");
        fetchProducts();
      } catch (error) {
        toast.error("حدث خطأ أثناء حذف المنتج");
      }
    }
  };

  const openEditDialog = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      purchase_price: product.purchase_price.toString(),
      sell_price: product.sell_price.toString(),
      quantity: product.quantity.toString(),
    });
    setShowEditDialog(true);
  };

  const canModifyInventory = accountType === "manager" || employeePermissions === "inventory_management" || employeePermissions === "deputy_manager";

  return (
    <div className="container mx-auto p-4 pb-24 md:pt-20">
      <Card className="fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl" data-testid="inventory-page-title">المخزون</CardTitle>
          {canModifyInventory && (
            <Button data-testid="add-product-btn" onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <PackageIcon className="ml-2 w-5 h-5" />
              إضافة منتج
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!isPro && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  النسخة المجانية: {products.length}/25 منتج
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className={`card-hover ${product.quantity < 3 ? "border-2 border-red-400" : ""}`}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg" data-testid={`product-${product.name}`}>{product.name}</h3>
                    <p className="text-sm text-gray-600">الباركود: {product.barcode}</p>
                    <div className="flex justify-between text-sm">
                      <span>سعر الشراء:</span>
                      <span className="font-semibold">{product.purchase_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>سعر البيع:</span>
                      <span className="font-semibold text-green-600">{product.sell_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>الكمية:</span>
                      <span className={`font-bold ${product.quantity < 3 ? "text-red-600" : "text-blue-600"}`}>
                        {product.quantity}
                        {product.quantity < 3 && " ⚠️"}
                      </span>
                    </div>
                  </div>
                  {canModifyInventory && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        data-testid={`edit-product-${product.name}`}
                        onClick={() => openEditDialog(product)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 ml-1" />
                        تعديل
                      </Button>
                      <Button
                        data-testid={`delete-product-${product.name}`}
                        onClick={() => handleDeleteProduct(product.id)}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                      >
                        <Trash2 className="w-4 h-4 ml-1" />
                        حذف
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <PackageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>لا توجد منتجات في المخزون</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle data-testid="add-product-dialog-title">إضافة منتج جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">اسم المنتج</Label>
              <Input
                id="name"
                data-testid="product-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="أدخل اسم المنتج"
              />
            </div>
            <div>
              <Label htmlFor="barcode">رمز الباركود</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  data-testid="product-barcode-input"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="أدخل رمز الباركود"
                  disabled={scanning}
                />
                <Button data-testid="scan-barcode-inventory-btn" onClick={handleScanBarcode} variant={scanning ? "destructive" : "default"}>
                  {scanning ? <X className="w-5 h-5" /> : <Scan className="w-5 h-5" />}
                </Button>
              </div>
              {scanning && (
                <div className="mt-2 border-2 border-blue-500 rounded-lg p-4 bg-gray-50">
                  <div id="qr-reader-inventory" className="w-full"></div>
                  <p className="text-center text-sm text-gray-600 mt-2">وجه الكاميرا نحو الباركود</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_price">سعر الشراء</Label>
                <Input
                  id="purchase_price"
                  data-testid="product-purchase-price-input"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="sell_price">سعر البيع</Label>
                <Input
                  id="sell_price"
                  data-testid="product-sell-price-input"
                  type="number"
                  step="0.01"
                  value={formData.sell_price}
                  onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="quantity">الكمية</Label>
              <Input
                id="quantity"
                data-testid="product-quantity-input"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button data-testid="save-product-btn" onClick={handleAddProduct} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>تعديل المنتج</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">اسم المنتج</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>رمز الباركود</Label>
              <Input value={formData.barcode} disabled className="bg-gray-100" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-purchase_price">سعر الشراء</Label>
                <Input
                  id="edit-purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-sell_price">سعر البيع</Label>
                <Input
                  id="edit-sell_price"
                  type="number"
                  step="0.01"
                  value={formData.sell_price}
                  onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-quantity">الكمية</Label>
              <Input
                id="edit-quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditProduct} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;