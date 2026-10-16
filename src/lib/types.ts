export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'INVENTORY_MANAGER';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export type TrackingMode = 'QUANTITY' | 'SERIALIZED';

export interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
}

export interface StockLocation {
  _id: string;
  name: string;
  code: string;
  type: string;
  address?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  hsnCode?: string;
  category: Category | string;
  brand: string;
  modelName?: string;
  description?: string;
  trackingMode: TrackingMode;
  unitOfMeasure: string;
  purchaseCost: number;
  defaultSellingPrice: number;
  supplier?: Supplier | string;
  minStockThreshold: number;
  stockQuantity: {
    onHand: number;
    reserved: number;
    issuedInternal: number;
    quarantined: number;
  };
  availableForSale: number;
  isLowStock?: boolean;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SerializedStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'ISSUED_INTERNAL'
  | 'MAINTENANCE'
  | 'QUARANTINED'
  | 'SOLD'
  | 'RETIRED';

export type ItemCondition = 'NEW' | 'MINT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

export interface SerializedItem {
  _id: string;
  assetId: string;
  manufacturerSerial?: string;
  product: Product;
  unitCost: number;
  location: StockLocation;
  status: SerializedStatus;
  condition: ItemCondition;
  warrantyExpiry?: string;
  currentUsage?: {
    _id: string;
    issueReference: string;
    assignedPerson: string;
    expectedReturnDate: string;
  };
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseLineItem {
  product: Product | string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

export interface Purchase {
  _id: string;
  purchaseOrderNumber: string;
  supplier: Supplier;
  invoiceReference?: string;
  orderDate: string;
  lineItems: PurchaseLineItem[];
  subtotal: number;
  additionalCosts: number;
  totalCost: number;
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  destinationLocation: StockLocation;
  notes?: string;
  createdBy: User;
  createdAt: string;
}

export interface PurchaseReceipt {
  _id: string;
  receiptNumber: string;
  purchase: Purchase;
  receivedDate: string;
  destinationLocation: StockLocation;
  lineItems: Array<{
    product: Product;
    quantityReceived: number;
    unitCost: number;
    serializedItemIds?: string[];
  }>;
  receivedBy: User;
  notes?: string;
  createdAt: string;
}

export interface SaleLineItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableAmount?: number;
  hsnCode?: string;
  cgstAmount?: number;
  sgstAmount?: number;
  total: number;
  serializedItemIds?: SerializedItem[];
}

export interface Sale {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  location: StockLocation;
  lineItems: SaleLineItem[];
  subtotal: number;
  discountTotal: number;
  taxableAmount?: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  taxTotal: number;
  grandTotal: number;
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED';
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  saleStatus: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'RETURNED' | 'PARTIALLY_RETURNED';
  notes?: string;
  remarks?: string;
  soldBy: User;
  confirmedAt: string;
  createdAt: string;
}

export interface InternalUsageItem {
  product: Product;
  quantityIssued: number;
  quantityReturned: number;
  serializedItemId?: SerializedItem;
  issueCondition: ItemCondition;
}

export interface RentalMonthlyPayment {
  _id?: string;
  monthIndex: number;
  billingMonth: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  paidAt?: string;
  paymentMethod?: string;
  transactionRef?: string;
  status: 'PAID' | 'DUE' | 'OVERDUE';
  notes?: string;
}

export interface RentalReminder {
  _id?: string;
  sentAt: string;
  sentTo: string;
  channel: string;
  message: string;
}

export interface InternalUsage {
  _id: string;
  issueReference: string;
  purpose: 'CLASS' | 'PRACTICE' | 'REHEARSAL' | 'DEMONSTRATION' | 'EVENT' | 'REPAIR' | 'OTHER';
  customPurposeDetail?: string;
  assignedPerson: string;
  assignedPersonContact?: string;
  customerEmail?: string;
  location: StockLocation;
  items: InternalUsageItem[];
  issueDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: 'ACTIVE' | 'RETURNED' | 'PARTIALLY_RETURNED' | 'OVERDUE';
  isOverdue?: boolean;
  notes?: string;
  issuedBy: User;
  isRental?: boolean;
  lockInPeriodMonths?: number;
  securityDeposit?: number;
  monthlyRent?: number;
  includedAccessories?: string[];
  monthlyPayments?: RentalMonthlyPayment[];
  totalRentPaid?: number;
  totalRentDue?: number;
  remindersSent?: RentalReminder[];
  extensions: Array<{
    extendedDate: string;
    reason: string;
    approvedBy: User;
    createdAt: string;
  }>;
  createdAt: string;
}

export interface StockMovement {
  _id: string;
  product: Product;
  serializedItem?: SerializedItem;
  location: StockLocation;
  movementType: string;
  quantityDelta: number;
  sourceStatus?: string;
  destinationStatus?: string;
  transactionRef: string;
  transactionModel: string;
  reason: string;
  performedBy: User;
  createdAt: string;
}

export interface InventoryAdjustment {
  _id: string;
  adjustmentReference: string;
  location: StockLocation;
  type: string;
  items: Array<{
    product: Product;
    serializedItem?: SerializedItem;
    quantityDelta: number;
    targetStatus?: string;
    reason: string;
  }>;
  reason: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  requestedBy: User;
  requiresApproval: boolean;
  approvedBy?: User;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface MaintenanceRecord {
  _id: string;
  recordReference: string;
  product: Product;
  serializedItem?: SerializedItem;
  location: StockLocation;
  problemDescription: string;
  repairDetails?: string;
  vendor?: string;
  cost: number;
  status: 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'UNREPAIRABLE';
  startedAt: string;
  completedAt?: string;
  createdByUser: User;
  releasedByUser?: User;
  releaseDisposition?: string;
  notes?: string;
}

export interface DashboardMetrics {
  kpis: {
    totalUnitsOnHand: number;
    totalAvailableForSale: number;
    distinctProductCount: number;
    serializedInUseCount: number;
    lowStockCount: number;
    activeUsageCount: number;
    overdueUsageCount: number;
    instrumentsUnderMaintenanceCount: number;
    todayReceiptsCount: number;
    periodSalesCount: number;
    periodSalesRevenue: number;
    pendingApprovalsCount: number;
    totalInventoryValuationAtCost: number;
    totalPotentialRetailValuation: number;
  };
  recentMovements: StockMovement[];
  salesTrend: Array<{ _id: string; revenue: number; count: number }>;
}
