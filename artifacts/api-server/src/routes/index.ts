import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientPhotoRouter from "./client-photo";
import reviewsRouter from "./reviews";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientPhotoRouter);
router.use(reviewsRouter);

export default router;
