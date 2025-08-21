import axios, {AxiosError} from "axios";
import {QuoteResponse, SwapResponse} from "../types.js";

export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export const getQuote = async (
    amount: number,
    inputMint: string = USDT_MINT,
    outputMint: string = SOL_MINT
): Promise<QuoteResponse> => {
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;

    try {
        const {data} = await axios.get<QuoteResponse>(url);

        if (data.error) {
            throw new Error(`Jupiter API error: ${data.error}`);
        }

        if (!data.inAmount || !data.outAmount) {
            throw new Error("Invalid quote response from Jupiter API");
        }

        if (data.inAmount !== amount.toString()) {
            console.warn(`Warning: Requested ${amount}, but quote returned ${data.inAmount}`);
        }

        return data;
    } catch (error: unknown) {
        const err = error as AxiosError<{ error: string }>;
        console.error("Error fetching quote:", err.response?.data || err.message);
        throw err;
    }
};

export const getSwapTransaction = async (
    quote: QuoteResponse,
    userPublicKey: string
): Promise<SwapResponse> => {
    try {
        const {data} = await axios.post<SwapResponse>(
            "https://quote-api.jup.ag/v6/swap",
            {
                quoteResponse: quote,
                userPublicKey,
                wrapAndUnwrapSol: true,
            },
            {
                headers: {"Content-Type": "application/json"},
            }
        );

        if (data.error) {
            throw new Error(`Jupiter swap error: ${data.error}`);
        }

        return data;
    } catch (error: unknown) {
        const err = error as AxiosError<{ error: string }>;
        console.error("Error getting swap transaction:", err.response?.data || err.message);
        throw err;
    }
};
