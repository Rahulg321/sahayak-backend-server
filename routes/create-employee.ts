import { Router, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
});

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  console.log("inside post request");

  res.json({
    message: "Employee created successfully",
  });
});

export default router;
