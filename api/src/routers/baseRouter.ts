import * as express from 'express';
import { NextFunction } from 'express';
import { baseProvider, ETH_ADDRESS, USDT_ADDRESS } from '../config/base.js';
import { getQuote, getSwapTransaction } from '../services/uniswap.js';
import { getWalletFromPrivateKey } from '../utils/baseWallet.js';
import { BalanceParams, BalanceResponse, ErrorResponse, SwapRequestBody, SwapResponseBody } from '../types.js';
import { ethers } from 'ethers';

const baseRouter = express.Router();

const wallet = getWalletFromPrivateKey(process.env.BASE_PRIVATE_KEY || "");

const bigIntToNumber = (bigIntValue: bigint): number => {
    return Number(bigIntValue.toString());
};

baseRouter.post(
    "/",
    async (
        req: express.Request<{}, {}, SwapRequestBody>,
        res: express.Response<SwapResponseBody | ErrorResponse>,
        next: NextFunction
    ): Promise<void> => {
        try {
            const { inputMint, outputMint, amount, direction } = req.body;

            const ethBalanceBigInt = await baseProvider.getBalance(wallet.address);
            const ethBalance = Number(ethers.formatEther(ethBalanceBigInt));
            const minEthBalance = 0.001;

            if (ethBalance < minEthBalance) {
                res.status(400).json({
                    error: `Недостаточно ETH для комиссий. Баланс: ${ethBalance} ETH, требуется: ${minEthBalance} ETH`
                });
                return;
            }

            const actualInputMint = inputMint || USDT_ADDRESS;
            const actualOutputMint = outputMint || ETH_ADDRESS;

            let actualAmount: number;
            if (amount) {
                actualAmount = amount;
            } else if (direction === 'usdtToEth') {
                actualAmount = 1;
            } else if (direction === 'ethToUsdt') {
                actualAmount = 0.001;
            } else {
                res.status(400).json({ error: "Specify amount or direction" });
                return;
            }

            if (actualInputMint === ETH_ADDRESS) {
                if (ethBalance < actualAmount) {
                    res.status(400).json({
                        error: `Недостаточно ETH. Баланс: ${ethBalance} ETH, требуется: ${actualAmount} ETH`
                    });
                    return;
                }
            } else {
                try {
                    const erc20 = new ethers.Contract(actualInputMint, [
                        "function balanceOf(address) view returns (uint256)",
                        "function decimals() view returns (uint8)"
                    ], baseProvider);

                    const balanceBigInt = await erc20.balanceOf(wallet.address);
                    const decimals = await erc20.decimals();

                    const balanceNumber = bigIntToNumber(balanceBigInt);
                    const decimalsNumber = Number(decimals);
                    const tokenBalance = balanceNumber / Math.pow(10, decimalsNumber);

                    if (tokenBalance < actualAmount) {
                        res.status(400).json({
                            error: `Недостаточно ${actualInputMint === USDT_ADDRESS ? 'USDT' : 'токена'}. Баланс: ${tokenBalance}, требуется: ${actualAmount}`
                        });
                        return;
                    }
                } catch (error) {
                    console.error('Error checking token balance:', error);
                    res.status(400).json({ error: "Ошибка получения баланса токена" });
                    return;
                }
            }

            let amountInWei: string;
            if (actualInputMint === ETH_ADDRESS) {
                amountInWei = ethers.parseEther(actualAmount.toString()).toString();
            } else {
                amountInWei = (actualAmount * Math.pow(10, 6)).toString();
            }

            const quote = await getQuote(amountInWei, actualInputMint, actualOutputMint);
            console.log("Quote:", quote);

            const swapResponse = await getSwapTransaction(quote, wallet.address);

            if (!swapResponse || !swapResponse.tx) {
                res.status(500).json({ error: "Ошибка при получении транзакции от Uniswap" });
                return;
            }

            try {
                const tx = await wallet.sendTransaction(swapResponse.tx);

                res.json({
                    success: true,
                    txid: tx.hash,
                    explorer: `https://basescan.org/tx/${tx.hash}`,
                    amountIn: actualAmount,
                    amountOut: quote.amountOut || "0"
                });
            } catch (error) {
                console.error('Transaction error:', error);
                res.status(500).json({ error: "Ошибка при отправке транзакции" });
            }

        } catch (e) {
            console.error('Error in swap:', e);
            next(e);
        }
    }
);

baseRouter.get(
    "/balance/:mintAddress",
    async (
        req: express.Request<BalanceParams>,
        res: express.Response<BalanceResponse | ErrorResponse>
    ) => {
        try {
            const { mintAddress } = req.params;

            if (mintAddress === ETH_ADDRESS) {
                const balanceBigInt = await baseProvider.getBalance(wallet.address);
                const balance = Number(ethers.formatEther(balanceBigInt));
                res.json({ balance });
            } else {
                try {
                    const erc20 = new ethers.Contract(mintAddress, [
                        "function balanceOf(address) view returns (uint256)",
                        "function decimals() view returns (uint8)"
                    ], baseProvider);

                    const balanceBigInt = await erc20.balanceOf(wallet.address);
                    const decimals = await erc20.decimals();

                    const balanceNumber = bigIntToNumber(balanceBigInt);
                    const decimalsNumber = Number(decimals);
                    const balance = balanceNumber / Math.pow(10, decimalsNumber);

                    res.json({ balance });
                } catch (error) {
                    console.error('Error getting token balance:', error);
                    res.json({ balance: 0 });
                }
            }
        } catch (err) {
            console.error('Error in balance endpoint:', err);
            if (err instanceof Error) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(500).json({ error: "Unknown error" });
            }
        }
    }
);

export default baseRouter;