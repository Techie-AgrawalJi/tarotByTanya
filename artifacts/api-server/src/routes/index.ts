import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientPhotoRouter from "./client-photo";
import reviewsRouter from "./reviews";
import bookingsRouter from "./bookings";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientPhotoRouter);
router.use(reviewsRouter);
router.use(bookingsRouter);
router.use(paymentsRouter);

export default router;
