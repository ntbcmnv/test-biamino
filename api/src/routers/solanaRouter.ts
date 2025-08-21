import {getAccount, getAssociatedTokenAddress} from '@solana/spl-token';
import {Keypair, PublicKey, VersionedTransaction} from '@solana/web3.js';

import * as express from 'express';
import {NextFunction} from 'express';
import {solanaConnection} from '../config/solana.js';
import {getQuote, getSwapTransaction, SOL_MINT, USDT_MINT} from '../services/jupiter.js';
import {getWalletFromPrivateKey} from '../utils/solanaWallet.js';
import {BalanceParams, BalanceResponse, ErrorResponse, SwapRequestBody, SwapResponseBody} from '../types.js';

const solanaRouter = express.Router();

const wallet: Keypair = getWalletFromPrivateKey(process.env.SOLANA_PRIVATE_KEY || "");

solanaRouter.post("/", async (req: express.Request, res: express.Response, next: NextFunction) => {
    try {
        const {inputMint, outputMint, amount, direction} = req.body;

        const solBalance = await solanaConnection.getBalance(wallet.publicKey);
        const minSolBalance = 0.002 * 10 ** 9;

        if (solBalance < minSolBalance) {
            return res.status(400).json({
                error: `Недостаточно SOL для комиссий. Баланс: ${solBalance / 10 ** 9} SOL, требуется: ${minSolBalance / 10 ** 9} SOL`
            });
        }

        let actualInputMint = inputMint || USDT_MINT;
        let actualOutputMint = outputMint || SOL_MINT;
        let actualAmount: number;

        if (amount) {
            actualAmount = amount;
        } else if (direction === 'usdtToSol') {
            actualAmount = 10 ** 6;
        } else if (direction === 'solToUsdt') {
            actualAmount = 0.01 * 10 ** 9;
        } else {
            return res.status(400).json({error: "Specify amount or direction"});
        }

        let tokenBalance = 0;
        try {
            const ata = await getAssociatedTokenAddress(new PublicKey(actualInputMint), wallet.publicKey);
            const accountInfo = await getAccount(solanaConnection, ata);

            const decimals = actualInputMint === USDT_MINT ? 6 : 9;
            tokenBalance = Number(accountInfo.amount) / 10 ** decimals;

            if (tokenBalance < actualAmount / 10 ** decimals) {
                return res.status(400).json({
                    error: `Недостаточно средств. Баланс: ${tokenBalance}, требуется: ${actualAmount / 10 ** decimals}`
                });
            }
        } catch (error) {
            return res.status(400).json({error: "Токен-аккаунт не найден или нулевой баланс"});
        }

        const quote = await getQuote(actualAmount, actualInputMint, actualOutputMint);
        console.log("Full quote response:", JSON.stringify(quote, null, 2));

        if (quote.inAmount !== actualAmount.toString()) {
            console.warn(`Предупреждение: Запрошено ${actualAmount}, но котировка вернула ${quote.inAmount}`);
        }

        const swapResponse = await getSwapTransaction(quote, wallet.publicKey.toBase58());
        if (!swapResponse.swapTransaction) {
            return res.status(500).json({error: "Ошибка при получении транзакции", swapResponse});
        }

        const tx = VersionedTransaction.deserialize(
            Buffer.from(swapResponse.swapTransaction, "base64")
        );
        tx.sign([wallet]);

        const txid = await solanaConnection.sendRawTransaction(tx.serialize());

        const latestBlockhash = await solanaConnection.getLatestBlockhash();

        await solanaConnection.confirmTransaction(
            {
                signature: txid,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
            'confirmed'
        );

        res.json({
            success: true,
            txid,
            explorer: `https://solscan.io/tx/${txid}`,
            amountIn: actualAmount,
            amountOut: quote.outAmount
        });

    } catch (e) {
        next(e);
    }
});

solanaRouter.post(
    "/",
    async (
        req: express.Request<{}, {}, SwapRequestBody>,
        res: express.Response<SwapResponseBody | ErrorResponse>,
        next: NextFunction
    ): Promise<Response | void> => {
        try {
            const {inputMint, outputMint, amount, direction} = req.body;

            const solBalance: number = await solanaConnection.getBalance(wallet.publicKey);
            const minSolBalance: number = 0.002 * 10 ** 9;

            if (solBalance < minSolBalance) {
                res.status(400).json({
                    error: `Недостаточно SOL для комиссий. Баланс: ${solBalance / 10 ** 9} SOL, требуется: ${minSolBalance / 10 ** 9} SOL`
                });
                return;
            }

            const actualInputMint: string = inputMint || USDT_MINT;
            const actualOutputMint: string = outputMint || SOL_MINT;

            let actualAmount: number;
            if (amount) {
                actualAmount = amount;
            } else if (direction === 'usdtToSol') {
                actualAmount = 10 ** 6;
            } else if (direction === 'solToUsdt') {
                actualAmount = 0.01 * 10 ** 9;
            } else {
                res.status(400).json({error: "Specify amount or direction"});
                return;
            }

            let tokenBalance = 0;
            try {
                const ata = await getAssociatedTokenAddress(new PublicKey(actualInputMint), wallet.publicKey);
                const accountInfo = await getAccount(solanaConnection, ata);

                const decimals = actualInputMint === USDT_MINT ? 6 : 9;
                tokenBalance = Number(accountInfo.amount) / 10 ** decimals;

                if (tokenBalance < actualAmount / 10 ** decimals) {
                    res.status(400).json({
                        error: `Недостаточно средств. Баланс: ${tokenBalance}, требуется: ${actualAmount / 10 ** decimals}`
                    });
                    return;
                }
            } catch {
                res.status(400).json({error: "Токен-аккаунт не найден или нулевой баланс"});
                return;
            }

            const quote = await getQuote(actualAmount, actualInputMint, actualOutputMint);
            console.log("Full quote response:", JSON.stringify(quote, null, 2));

            if (quote.inAmount !== actualAmount.toString()) {
                console.warn(`Предупреждение: Запрошено ${actualAmount}, но котировка вернула ${quote.inAmount}`);
            }

            const swapResponse = await getSwapTransaction(quote, wallet.publicKey.toBase58());
            if (!swapResponse.swapTransaction) {
                res.status(500).json({error: "Ошибка при получении транзакции"});
                return;
            }

            const tx = VersionedTransaction.deserialize(
                Buffer.from(swapResponse.swapTransaction, "base64")
            );
            tx.sign([wallet]);

            const txid: string = await solanaConnection.sendRawTransaction(tx.serialize());
            const latestBlockhash = await solanaConnection.getLatestBlockhash();

            await solanaConnection.confirmTransaction(
                {
                    signature: txid,
                    blockhash: latestBlockhash.blockhash,
                    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                },
                'confirmed'
            );

            res.json({
                success: true,
                txid,
                explorer: `https://solscan.io/tx/${txid}`,
                amountIn: actualAmount,
                amountOut: quote.outAmount
            });
            return;
        } catch (e) {
            next(e);
        }
    }
);


solanaRouter.get(
    "/balance/:mintAddress",
    async (
        req: express.Request<BalanceParams>,
        res: express.Response<BalanceResponse | ErrorResponse>
    ) => {
        try {
            const {mintAddress} = req.params;
            const ata = await getAssociatedTokenAddress(new PublicKey(mintAddress), wallet.publicKey);

            try {
                const accountInfo = await getAccount(solanaConnection, ata);
                const decimals = mintAddress === USDT_MINT ? 6 : 9;
                const balance: number = Number(accountInfo.amount) / 10 ** decimals;

                res.json({balance});
            } catch {
                res.json({balance: 0});
            }
        } catch (err) {
            if (err instanceof Error) {
                res.status(500).json({error: err.message});
            }
            res.status(500).json({error: "Unknown error"});
        }
    }
);

export default solanaRouter;