import axios from "axios";

const UNISWAP_API = "https://api.uniswap.org/v1";

export interface QuoteResponse {
    amountIn: string;
    amountOut: string;
    [key: string]: any;
}

export interface SwapResponse {
    tx: any;
    [key: string]: any;
}

export const getQuote = async (
    amount: string,
    inputToken: string,
    outputToken: string
): Promise<QuoteResponse> => {
    try {
        const params = {
            tokenIn: inputToken,
            tokenOut: outputToken,
            amount: amount,
            protocol: "v3",
            includeGas: "true"
        };

        console.log('Uniswap quote params:', params);

        const { data } = await axios.get(`${UNISWAP_API}/quote`, { params });
        return data;
    } catch (error: any) {
        console.error("Error fetching quote from Uniswap:", error.response?.data || error.message);
        throw new Error(`Uniswap API error: ${error.response?.data?.error || error.message}`);
    }
};

export const getSwapTransaction = async (
    quote: QuoteResponse,
    userAddress: string
): Promise<SwapResponse> => {
    try {
        const requestBody = {
            quoteResponse: quote,
            userAddress,
            slippageTolerance: "0.5"
        };

        console.log('Uniswap swap request:', requestBody);

        const { data } = await axios.post(`${UNISWAP_API}/swap`, requestBody, {
            headers: { "Content-Type": "application/json" }
        });

        return data;
    } catch (error: any) {
        console.error("Error getting swap transaction:", error.response?.data || error.message);
        throw new Error(`Uniswap swap error: ${error.response?.data?.error || error.message}`);
    }
};