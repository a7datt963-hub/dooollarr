import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Printer, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

const Invoice = ({ sale, onClose }) => {
  const invoiceRef = useRef(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    };
    return date.toLocaleString("ar-EG", options);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `invoice-${sale.id}.png`, { type: "image/png" });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "فاتورة",
            text: `فاتورة رقم ${sale.id}`,
          });
        } else {
          // Fallback: Download as image
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `invoice-${sale.id}.png`;
          a.click();
          toast.success("تم تنزيل الفاتورة كصورة");
        }
      });
    } catch (error) {
      toast.error("حدث خطأ أثناء مشاركة الفاتورة");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 no-print">
      <Card className="w-full max-w-md bg-white">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4 no-print">
            <h2 className="text-xl font-bold">الفاتورة</h2>
            <Button data-testid="close-invoice-btn" onClick={onClose} variant="ghost" size="sm">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div ref={invoiceRef} className="print-area border-2 border-dashed border-gray-300 p-6 rounded-lg bg-white">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-blue-600 mb-2">كاشيرنا</h1>
              <p className="text-sm text-gray-600">{formatDate(sale.created_at)}</p>
            </div>

            <div className="border-t-2 border-b-2 border-gray-300 py-4 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right pb-2">المنتج</th>
                    <th className="text-center pb-2">الكمية</th>
                    <th className="text-left pb-2">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 text-right">{item.product_name}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-left">{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="font-medium">إجمالي العناصر:</span>
                <span>{sale.total_items}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">إجمالي الكميات:</span>
                <span>{sale.total_quantity}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t-2 pt-2">
                <span>المجموع:</span>
                <span data-testid="invoice-total">{sale.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center border-t-2 pt-4">
              <p className="text-lg font-semibold text-gray-700">شكراً لزيارتكم</p>
            </div>
          </div>

          <div className="flex gap-2 mt-4 no-print">
            <Button
              data-testid="print-invoice-btn"
              onClick={handlePrint}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="ml-2 w-5 h-5" />
              طباعة
            </Button>
            <Button
              data-testid="share-invoice-btn"
              onClick={handleShare}
              variant="outline"
              className="flex-1"
            >
              <Share2 className="ml-2 w-5 h-5" />
              مشاركة
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoice;
