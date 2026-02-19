from fastapi import FastAPI, APIRouter, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import random
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    barcode: str
    purchase_price: float
    sell_price: float
    quantity: int
    manager_code: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    name: str
    barcode: str
    purchase_price: float
    sell_price: float
    quantity: int
    manager_code: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    barcode: Optional[str] = None
    purchase_price: Optional[float] = None
    sell_price: Optional[float] = None
    quantity: Optional[int] = None

class SaleItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    sell_price: float
    purchase_price: float
    total: float

class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: List[SaleItem]
    total_items: int
    total_quantity: int
    total_amount: float
    profit: float
    manager_code: Optional[str] = None
    employee_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SaleCreate(BaseModel):
    items: List[SaleItem]
    total_items: int
    total_quantity: int
    total_amount: float
    profit: float
    manager_code: Optional[str] = None
    employee_name: Optional[str] = None

class Manager(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    manager_code: str
    is_pro: bool = False
    activation_code_used: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    manager_code: str
    status: str = "pending"
    permissions: str = "sales_only"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EmployeeCreate(BaseModel):
    name: str
    manager_code: str

class EmployeePermissionUpdate(BaseModel):
    employee_id: str
    permissions: str

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "global_settings"
    currency: str = "ل.س"
    manager_code: Optional[str] = None

class ActivationRequest(BaseModel):
    code: str
    manager_code: str

# Predefined activation codes
ACTIVATION_CODES = [
    "A7D9K3P1Q8Z2", "B4F6L8R0S3N7", "C2M5T9V1X4Y8", "D9Q1Z6H3W7K2",
    "E3N7A4J8P0L5", "F8R2S6B1V9M4", "G1K9P5X2T7C8", "H6L3Z8Q0N5Y1",
    "J2V7M4R9S1K6", "K5P8T2A9D3F1", "L9X1C6V4B7N2", "M3S7Q0H4J8P6",
    "N4Y2K9Z5R1T7", "P7B1M8L3S4Q9", "Q0D6F2V9X3K5", "R8N5A1P7Z4M2",
    "S2K4T9B6V1Q7", "T6P3R8X0L5N1", "V1Z9M4S2K7Q6", "W3A8D5P1R9L2",
    "X9C2V6B4T1K7", "Y5Q1N7M3S8P2", "Z2K7P9X4D1V6", "0A9B8C7D6E5F",
    "1G4H7J2K9L0M", "GOW47EOS6JSY", "AJ0WJ7JW9QHS", "KW40QBS87HDG",
    "HWUW92167QWO", "FSKOQTDBDOEI", "ATEHDPDGDTWY", "GSHSHOIISTST",
    "SGSJSOSHWGDY", "RREWUIOSPKXB", "SFKLMNDAWIQY", "GSPWTNDLXXYK",
    "2UWHDHLA9YDG", "GDJWO0HSHSGZK", "GSIWTSJSUQRD", "YSRQRRRTUIOP",
    "ATDOTEGDGHJK", "AHSYEDVNXOYEH", "SGWTPDH19GSO", "DAR2GSOWT921"
]

def generate_manager_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))

# Product Routes
@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    # Check if manager has pro or within free limit
    if product.manager_code:
        manager = await db.managers.find_one({"manager_code": product.manager_code}, {"_id": 0})
        if manager and not manager.get("is_pro", False):
            product_count = await db.products.count_documents({"manager_code": product.manager_code})
            if product_count >= 25:
                raise HTTPException(status_code=400, detail="free_limit_reached")
    
    # Check if barcode exists
    existing = await db.products.find_one({"barcode": product.barcode, "manager_code": product.manager_code}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="barcode_exists")
    
    product_obj = Product(**product.model_dump())
    doc = product_obj.model_dump()
    await db.products.insert_one(doc)
    return product_obj

@api_router.get("/products", response_model=List[Product])
async def get_products(manager_code: Optional[str] = None):
    query = {"manager_code": manager_code} if manager_code else {}
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="product_not_found")
    return product

@api_router.get("/products/barcode/{barcode}")
async def get_product_by_barcode(barcode: str, manager_code: Optional[str] = None):
    query = {"barcode": barcode}
    if manager_code:
        query["manager_code"] = manager_code
    product = await db.products.find_one(query, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="product_not_found")
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductUpdate):
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="no_data_provided")
    
    result = await db.products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="product_not_found")
    
    updated_product = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated_product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="product_not_found")
    return {"message": "product_deleted"}

# Sales Routes
@api_router.post("/sales", response_model=Sale)
async def create_sale(sale: SaleCreate):
    # Update product quantities
    for item in sale.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"product_not_found: {item.product_id}")
        
        new_quantity = product["quantity"] - item.quantity
        if new_quantity < 0:
            raise HTTPException(status_code=400, detail=f"insufficient_quantity: {item.product_name}")
        
        await db.products.update_one({"id": item.product_id}, {"$set": {"quantity": new_quantity}})
    
    sale_obj = Sale(**sale.model_dump())
    doc = sale_obj.model_dump()
    await db.sales.insert_one(doc)
    return sale_obj

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(manager_code: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {}
    if manager_code:
        query["manager_code"] = manager_code
    if start_date or end_date:
        query["created_at"] = {}
        if start_date:
            query["created_at"]["$gte"] = start_date
        if end_date:
            query["created_at"]["$lte"] = end_date
    
    sales = await db.sales.find(query, {"_id": 0}).to_list(10000)
    return sales

@api_router.get("/sales/{sale_id}", response_model=Sale)
async def get_sale(sale_id: str):
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="sale_not_found")
    return sale

@api_router.delete("/sales")
async def delete_all_sales(manager_code: str):
    await db.sales.delete_many({"manager_code": manager_code})
    return {"message": "sales_deleted"}

# Manager Routes
@api_router.post("/managers", response_model=Manager)
async def create_manager():
    manager_code = generate_manager_code()
    while await db.managers.find_one({"manager_code": manager_code}, {"_id": 0}):
        manager_code = generate_manager_code()
    
    manager = Manager(manager_code=manager_code)
    doc = manager.model_dump()
    await db.managers.insert_one(doc)
    return manager

@api_router.get("/managers/{manager_code}", response_model=Manager)
async def get_manager(manager_code: str):
    manager = await db.managers.find_one({"manager_code": manager_code}, {"_id": 0})
    if not manager:
        raise HTTPException(status_code=404, detail="manager_not_found")
    return manager

@api_router.put("/managers/{manager_code}/regenerate")
async def regenerate_manager_code(manager_code: str):
    manager = await db.managers.find_one({"manager_code": manager_code}, {"_id": 0})
    if not manager:
        raise HTTPException(status_code=404, detail="manager_not_found")
    
    new_code = generate_manager_code()
    while await db.managers.find_one({"manager_code": new_code}, {"_id": 0}):
        new_code = generate_manager_code()
    
    await db.managers.update_one({"manager_code": manager_code}, {"$set": {"manager_code": new_code}})
    await db.products.update_many({"manager_code": manager_code}, {"$set": {"manager_code": new_code}})
    await db.sales.update_many({"manager_code": manager_code}, {"$set": {"manager_code": new_code}})
    await db.employees.delete_many({"manager_code": manager_code})
    
    return {"new_code": new_code}

@api_router.post("/managers/activate", response_model=Manager)
async def activate_pro(activation: ActivationRequest):
    if activation.code not in ACTIVATION_CODES:
        raise HTTPException(status_code=400, detail="invalid_code")
    
    used_code = await db.activation_codes.find_one({"code": activation.code}, {"_id": 0})
    if used_code:
        raise HTTPException(status_code=400, detail="code_already_used")
    
    manager = await db.managers.find_one({"manager_code": activation.manager_code}, {"_id": 0})
    if not manager:
        raise HTTPException(status_code=404, detail="manager_not_found")
    
    await db.activation_codes.insert_one({"code": activation.code, "used_by": activation.manager_code, "used_at": datetime.now(timezone.utc).isoformat()})
    await db.managers.update_one({"manager_code": activation.manager_code}, {"$set": {"is_pro": True, "activation_code_used": activation.code}})
    
    updated_manager = await db.managers.find_one({"manager_code": activation.manager_code}, {"_id": 0})
    return updated_manager

# Employee Routes
@api_router.post("/employees", response_model=Employee)
async def create_employee(employee: EmployeeCreate):
    manager = await db.managers.find_one({"manager_code": employee.manager_code}, {"_id": 0})
    if not manager:
        raise HTTPException(status_code=404, detail="invalid_manager_code")
    
    employee_obj = Employee(**employee.model_dump())
    doc = employee_obj.model_dump()
    await db.employees.insert_one(doc)
    return employee_obj

@api_router.get("/employees", response_model=List[Employee])
async def get_employees(manager_code: str, status: Optional[str] = None):
    query = {"manager_code": manager_code}
    if status:
        query["status"] = status
    employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
    return employees

@api_router.put("/employees/{employee_id}/status")
async def update_employee_status(employee_id: str, status: str):
    result = await db.employees.update_one({"id": employee_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="employee_not_found")
    return {"message": "status_updated"}

@api_router.put("/employees/permissions")
async def update_employee_permissions(update: EmployeePermissionUpdate):
    result = await db.employees.update_one({"id": update.employee_id}, {"$set": {"permissions": update.permissions}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="employee_not_found")
    return {"message": "permissions_updated"}

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str):
    result = await db.employees.delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="employee_not_found")
    return {"message": "employee_deleted"}

# Settings Routes
@api_router.get("/settings", response_model=Settings)
async def get_settings(manager_code: Optional[str] = None):
    query = {"manager_code": manager_code} if manager_code else {"id": "global_settings"}
    settings = await db.settings.find_one(query, {"_id": 0})
    if not settings:
        settings = Settings(manager_code=manager_code).model_dump()
        await db.settings.insert_one(settings)
    return settings

@api_router.put("/settings")
async def update_settings(currency: str, manager_code: Optional[str] = None):
    query = {"manager_code": manager_code} if manager_code else {"id": "global_settings"}
    await db.settings.update_one(query, {"$set": {"currency": currency}}, upsert=True)
    return {"message": "settings_updated"}

@api_router.post("/settings/reset-profits")
async def reset_profits(manager_code: Optional[str] = None):
    query = {"manager_code": manager_code} if manager_code else {}
    await db.sales.update_many(query, {"$set": {"profit": 0}})
    return {"message": "profits_reset"}

@api_router.delete("/settings/reset-all")
async def reset_all(manager_code: str):
    await db.products.delete_many({"manager_code": manager_code})
    await db.sales.delete_many({"manager_code": manager_code})
    await db.employees.delete_many({"manager_code": manager_code})
    await db.settings.delete_many({"manager_code": manager_code})
    return {"message": "all_data_deleted"}

# Statistics Routes
@api_router.get("/statistics")
async def get_statistics(manager_code: str, filter_type: str = "daily", start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {"manager_code": manager_code}
    
    if filter_type == "daily":
        today = datetime.now(timezone.utc).date().isoformat()
        query["created_at"] = {"$gte": today}
    elif filter_type == "weekly":
        week_ago = (datetime.now(timezone.utc).timestamp() - 7 * 24 * 60 * 60)
        week_ago_str = datetime.fromtimestamp(week_ago, timezone.utc).isoformat()
        query["created_at"] = {"$gte": week_ago_str}
    elif filter_type == "monthly":
        month_ago = (datetime.now(timezone.utc).timestamp() - 30 * 24 * 60 * 60)
        month_ago_str = datetime.fromtimestamp(month_ago, timezone.utc).isoformat()
        query["created_at"] = {"$gte": month_ago_str}
    elif filter_type == "custom" and start_date and end_date:
        query["created_at"] = {"$gte": start_date, "$lte": end_date}
    
    sales = await db.sales.find(query, {"_id": 0}).to_list(10000)
    
    total_sales = sum(sale["total_amount"] for sale in sales)
    total_products = sum(sale["total_items"] for sale in sales)
    total_profit = sum(sale["profit"] for sale in sales)
    
    products_sold = {}
    for sale in sales:
        for item in sale["items"]:
            if item["product_name"] not in products_sold:
                products_sold[item["product_name"]] = {"name": item["product_name"], "quantity": 0}
            products_sold[item["product_name"]]["quantity"] += item["quantity"]
    
    return {
        "total_sales": total_sales,
        "total_products": total_products,
        "total_profit": total_profit,
        "products_sold": list(products_sold.values())
    }

# Export Routes
@api_router.get("/export")
async def export_data(manager_code: str, data_type: str = "all"):
    result = {}
    
    if data_type in ["products", "all"]:
        products = await db.products.find({"manager_code": manager_code}, {"_id": 0}).to_list(1000)
        result["products"] = products
    
    if data_type in ["sales", "all"]:
        sales = await db.sales.find({"manager_code": manager_code}, {"_id": 0}).to_list(10000)
        result["sales"] = sales
    
    return result

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()