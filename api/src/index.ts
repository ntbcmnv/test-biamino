import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import solanaRouter from './routers/solanaRouter.js';
import aptosRouter from './routers/aptosRouter.js';
import baseRouter from './routers/baseRouter.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/solana", solanaRouter);
app.use("/aptos", aptosRouter);
app.use("/base", baseRouter);

const PORT = 8000;

app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});