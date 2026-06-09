import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientPhotoRouter from "./client-photo";
import reviewsRouter from "./reviews";
import bookingsRouter from "./bookings";
import paymentsRouter from "./payments";
import guideStatusRouter from "./guide-status";
import blockedDatesRouter from "./blocked-dates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientPhotoRouter);
router.use(reviewsRouter);
router.use(guideStatusRouter);
router.use(blockedDatesRouter);
router.use(bookingsRouter);
router.use(paymentsRouter);

export default router;