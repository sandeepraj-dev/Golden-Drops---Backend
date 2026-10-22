import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  masterCreateSchema,
  masterPatchSchema,
  priceSchema,
  purchaseSchema,
  saleSchema,
  paymentSchema,
} from "../validators/schemas.js";
import {
  loginController,
  setupAdminController,
} from "../controllers/auth.controller.js";
import * as master from "../controllers/master.controller.js";
import * as tx from "../controllers/transaction.controller.js";

const router = Router();
const admin = authorize("ADMIN");
const manager = authorize("ADMIN", "MANAGER");
const staff = authorize("ADMIN", "MANAGER", "STAFF");
router.post("/auth/setup-admin", setupAdminController);
router.post("/auth/login", validate(loginSchema), loginController);
router.get("/health", (_req, res) =>
  res.json({
    success: true,
    data: { status: "ok", time: new Date().toISOString() },
  }),
);
router.use(authenticate);

for (const [path, kind] of [
  ["customers", "customers"],
  ["suppliers", "suppliers"],
  ["oil-types", "oil-types"],
  ["storage-locations", "storage-locations"],
]) {
  router.get(`/${path}`, master.list(kind));
  router.post(
    `/${path}`,
    manager,
    validate(masterCreateSchema),
    master.create(kind),
  );
  router.get(`/${path}/:id`, master.get(kind));
  router.patch(
    `/${path}/:id`,
    manager,
    validate(masterPatchSchema),
    master.update(kind),
  );
  // PUT is a compatibility alias; partial updates use the same validation.
  router.put(
    `/${path}/:id`,
    manager,
    validate(masterPatchSchema),
    master.update(kind),
  );
  router.delete(`/${path}/:id`, manager, master.deactivate(kind));
}
router.get("/users", admin, master.usersList);
router.post("/users", admin, master.usersCreate);
router.patch("/users/:id", admin, master.usersPatch);

router.get("/oil-prices", tx.pricesList);
router.post("/oil-prices", manager, validate(priceSchema), tx.priceCreate);
router.patch("/oil-prices/:id/close", manager, tx.priceClose);

router.get("/purchases", tx.purchasesList);
router.post("/purchases", staff, validate(purchaseSchema), tx.purchaseCreate);
router.get("/purchases/:id", tx.purchaseGet);
router.post("/purchases/:id/reverse", manager, tx.purchaseReverse);
router.get("/purchases/:id/pdf", tx.invoicePdf("PURCHASE"));

router.get("/sales", tx.salesList);
router.post("/sales", staff, validate(saleSchema), tx.saleCreate);
router.get("/sales/:id", tx.saleGet);
router.get("/sales/:id/pdf", tx.invoicePdf("SALE"));

router.get("/payments", tx.paymentsList);
router.post("/payments", staff, validate(paymentSchema), tx.paymentCreate);
router.get("/payments/:id/receipt.pdf", tx.paymentReceiptPdf);

router.get("/stock", tx.stockList);
router.get("/stock/ledger", tx.stockLedgerList);
router.post("/stock/opening", manager, tx.openingStock);
router.get("/daily-stock", tx.dailyStockList);
router.post("/daily-stock/generate", staff, tx.dailyStockGenerate);
router.patch("/daily-stock/:id/physical-count", staff, tx.dailyStockPhysical);
router.post("/daily-stock/:id/approve", manager, tx.dailyStockApprove);
router.get("/reports/stock/daily.pdf", tx.dailyStockPdf);

router.get("/expenses", tx.expensesList);
router.post("/expenses", staff, tx.expenseCreate);
router.get("/reports/profit-loss", manager, tx.pnl);
router.get("/reports/profit-loss.pdf", manager, tx.pnlPdf);
router.get("/dashboard", tx.dashboard);
router.get("/customers/:id/statement", tx.customerStatementController);
router.get("/customers/:id/statement.pdf", tx.customerStatementController);
router.get("/suppliers/:id/statement", tx.supplierStatementController);
router.get("/audit-logs", manager, tx.auditList);


export default router;
