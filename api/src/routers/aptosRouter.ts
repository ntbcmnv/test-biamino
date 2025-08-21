import express from "express";
import {aptosClient} from "../config/aptos.js";
import {getAptosWalletFromPrivateKey} from "../utils/aptosWallet.js";
import {getSwapPayload, getTokenBalance, APTOS_USDT, APTOS_APT} from "../services/liquidswap.js";

const aptosRouter = express.Router();
const wallet = getAptosWalletFromPrivateKey(process.env.APTOS_PRIVATE_KEY || "");

aptosRouter.post("/", async (req: express.Request, res: express.Response) => {
    try {
        const {direction, amount} = req.body;

        if (direction !== 'usdtToApt' && direction !== 'aptToUsdt') {
            return res.status(400).json({
                error: "Invalid direction. Use 'usdtToApt' or 'aptToUsdt'"
            });
        }

        const aptBalance = await getTokenBalance(aptosClient, wallet.address().toString(), APTOS_APT);
        const minAptBalance = 0.01 * 10 ** 8;

        if (aptBalance < minAptBalance) {
            return res.status(400).json({
                error: `Недостаточно APT для комиссий. Баланс: ${aptBalance / 10 ** 8} APT, требуется: ${minAptBalance / 10 ** 8} APT`
            });
        }

        let fromCoin, toCoin, swapAmount;

        if (direction === 'usdtToApt') {
            fromCoin = APTOS_USDT;
            toCoin = APTOS_APT;
            swapAmount = amount || (10 ** 6);
        } else {
            fromCoin = APTOS_APT;
            toCoin = APTOS_USDT;
            swapAmount = amount || (0.1 * 10 ** 8);
        }

        const tokenBalance = await getTokenBalance(aptosClient, wallet.address().toString(), fromCoin);

        const decimals = fromCoin === APTOS_USDT ? 6 : 8;
        const displayBalance = tokenBalance / 10 ** decimals;
        const displayRequired = swapAmount / 10 ** decimals;

        if (tokenBalance < swapAmount) {
            const tokenName = fromCoin === APTOS_USDT ? 'USDT' : 'APT';
            return res.status(400).json({
                error: `Недостаточно средств. Баланс: ${displayBalance} ${tokenName}, требуется: ${displayRequired} ${tokenName}`
            });
        }

        const payload = getSwapPayload(fromCoin, toCoin, swapAmount.toString());
        const transaction = await aptosClient.generateTransaction(wallet.address(), payload);

        const signedTxn = await aptosClient.signTransaction(wallet, transaction);
        const pendingTxn = await aptosClient.submitTransaction(signedTxn);

        await aptosClient.waitForTransaction(pendingTxn.hash);

        res.json({
            success: true,
            txid: pendingTxn.hash,
            explorer: `https://aptoscan.com/txn/${pendingTxn.hash}`,
            amountIn: swapAmount,
            direction: direction
        });

    } catch (error: any) {
        console.error("Aptos swap error:", error);
        res.status(500).json({error: error.message});
    }
});

aptosRouter.get("/balance/:coinType", async (req, res) => {
    try {
        const {coinType} = req.params;
        const balance = await getTokenBalance(aptosClient, wallet.address().toString(), coinType);

        const decimals = coinType === APTOS_USDT ? 6 : 8;
        res.json({balance: balance / 10 ** decimals});
    } catch (error: any) {
        res.status(500).json({error: error.message});
    }
});

export default aptosRouter;